-- EcoCycle Nexus MVP production schema
-- Run this once in Supabase SQL Editor.
-- It creates real auth profiles, pickup jobs, role permissions, and atomic operations.

create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('individual','collector','processor','admin')),
  location text,
  points int not null default 0,
  wallet numeric(12,2) not null default 0,
  vehicle text,
  rating numeric(3,2),
  created_at timestamptz not null default now()
);

create table if not exists waste_submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  weight_kg numeric(10,2) not null check (weight_kg > 0),
  status text not null default 'Awaiting confirmation',
  address text not null,
  notes text,
  scheduled timestamptz,
  created_at timestamptz not null default now()
);

alter table waste_submissions add column if not exists scheduled timestamptz;

create table if not exists pickups (
  id uuid primary key default uuid_generate_v4(),
  waste_id uuid unique references waste_submissions(id) on delete set null,
  collector_id uuid references users(id) on delete set null,
  status text not null default 'Available',
  scheduled timestamptz,
  address text not null,
  payout numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists inventory (
  id uuid primary key default uuid_generate_v4(),
  material text not null,
  qty_kg numeric(12,2) not null default 0,
  source text,
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  price numeric(12,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  blurb text
);

create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  product_id uuid references products(id),
  qty int not null default 1 check (qty > 0),
  status text not null default 'Processing',
  total numeric(12,2) not null default 0,
  placed_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  provider text default 'paystack',
  reference text,
  amount numeric(12,2),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references users(id) on delete cascade,
  recipient_id uuid references users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  read boolean not null default false
);

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  text text not null,
  type text,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

create index if not exists idx_users_auth_id on users(auth_id);
create index if not exists idx_users_role on users(role);
create index if not exists idx_waste_user_created on waste_submissions(user_id, created_at desc);
create index if not exists idx_waste_status on waste_submissions(status);
create index if not exists idx_pickups_status_scheduled on pickups(status, scheduled);
create index if not exists idx_pickups_collector on pickups(collector_id, status);
create index if not exists idx_orders_user_placed on orders(user_id, placed_at desc);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_messages_participants on messages(sender_id, recipient_id, created_at desc);
create index if not exists idx_notifications_user on notifications(user_id, created_at desc);

-- ---------- identity helpers ----------

create or replace function current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_id = auth.uid() limit 1;
$$;

create or replace function current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where auth_id = auth.uid() limit 1;
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_user_role() = 'admin', false);
$$;

create or replace function owns_waste(p_waste_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.waste_submissions w
    where w.id = p_waste_id and w.user_id = current_profile_id()
  );
$$;

create or replace function collector_has_waste(p_waste_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pickups p
    where p.waste_id = p_waste_id and p.collector_id = current_profile_id()
  );
$$;

-- ---------- automatic profile creation ----------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'individual');
  if requested_role not in ('individual','collector','processor') then
    requested_role := 'individual';
  end if;

  insert into public.users (auth_id, name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(coalesce(new.email, 'EcoCycle User'), '@', 1)),
    requested_role
  )
  on conflict (auth_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ecocycle on auth.users;
create trigger on_auth_user_created_ecocycle
after insert on auth.users
for each row execute procedure handle_new_user();

-- ---------- automatic pickup creation ----------

create or replace function payout_rate(waste_type text)
returns numeric
language sql
immutable
as $$
  select case
    when waste_type ilike '%PET%' then 200
    when waste_type ilike '%organic%' then 120
    when waste_type ilike '%agricultural%' then 120
    when waste_type ilike '%paper%' then 80
    else 70
  end;
$$;

create or replace function create_pickup_for_waste()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pickups (waste_id, status, scheduled, address, payout)
  values (
    new.id,
    'Available',
    new.scheduled,
    new.address,
    round(new.weight_kg * payout_rate(new.type), 2)
  )
  on conflict (waste_id) do nothing;
  return new;
end;
$$;

drop trigger if exists after_waste_submission on waste_submissions;
create trigger after_waste_submission
after insert on waste_submissions
for each row execute procedure create_pickup_for_waste();

-- ---------- atomic pickup operations ----------

create or replace function accept_pickup(p_pickup_id uuid, p_collector_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int;
begin
  if not exists (select 1 from users where id = p_collector_id and auth_id = auth.uid() and role = 'collector') then
    raise exception 'Only the signed-in collector can accept jobs';
  end if;

  update pickups
  set collector_id = p_collector_id, status = 'En route'
  where id = p_pickup_id and status = 'Available' and collector_id is null;

  get diagnostics updated_count = row_count;

  if updated_count = 1 then
    update waste_submissions
    set status = 'Pending pickup'
    where id = (select waste_id from pickups where id = p_pickup_id);
  end if;
  return updated_count = 1;
end;
$$;

create or replace function confirm_pickup(p_pickup_id uuid, p_weight_kg numeric, p_collector_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  p pickups%rowtype;
  w waste_submissions%rowtype;
begin
  if p_weight_kg <= 0 then raise exception 'Weight must be greater than zero'; end if;
  if not exists (select 1 from users where id = p_collector_id and auth_id = auth.uid() and role = 'collector') then
    raise exception 'Invalid collector';
  end if;

  select * into p from pickups where id = p_pickup_id for update;
  if not found or p.collector_id <> p_collector_id or p.status not in ('En route','Arrived') then
    raise exception 'Pickup is not assigned to this collector or is already completed';
  end if;

  select * into w from waste_submissions where id = p.waste_id for update;
  if not found then raise exception 'Waste submission not found'; end if;

  update pickups set status = 'Completed' where id = p.id;
  update waste_submissions
  set status = 'Collected', weight_kg = p_weight_kg
  where id = w.id;

  update users
  set wallet = wallet + p.payout
  where id = p_collector_id;

  update users
  set points = points + greatest(1, floor(p_weight_kg * 10)::int)
  where id = w.user_id;

  insert into notifications (user_id, text, type)
  values
    (w.user_id, 'Your waste pickup was completed. Green Points have been added.', 'pickup'),
    (p_collector_id, 'Collection confirmed. Your collector payout has been added.', 'reward');

  return true;
end;
$$;

-- ---------- atomic order placement + stock reservation ----------

create or replace function place_order(p_user_id uuid, p_items jsonb, p_total numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  product_row products%rowtype;
  q int;
  authoritative_total numeric := 0;
  order_id uuid;
  ids jsonb := '[]'::jsonb;
begin
  if p_user_id is distinct from current_profile_id() then
    raise exception 'You can only place orders for your own account';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    q := greatest(1, (item->>'qty')::int);
    select * into product_row from products
    where id = (item->>'product_id')::uuid
    for update;

    if not found then raise exception 'Product not found'; end if;
    if product_row.stock < q then raise exception 'Not enough stock for %', product_row.name; end if;

    authoritative_total := authoritative_total + product_row.price * q;
  end loop;

  -- The frontend total is only a display value. The database remains authoritative.
  if abs(authoritative_total - coalesce(p_total, authoritative_total)) > 0.01 then
    -- allow the server to correct stale carts rather than charging a forged amount
    null;
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    q := greatest(1, (item->>'qty')::int);
    select * into product_row from products where id = (item->>'product_id')::uuid for update;

    update products set stock = stock - q where id = product_row.id;
    insert into orders (user_id, product_id, qty, status, total)
    values (p_user_id, product_row.id, q, 'Processing', product_row.price * q)
    returning id into order_id;

    insert into payments (order_id, provider, amount, status)
    values (order_id, 'pay_on_delivery', product_row.price * q, 'pending');

    ids := ids || to_jsonb(order_id);
  end loop;

  return jsonb_build_object('order_ids', ids, 'total', authoritative_total);
end;
$$;

-- Backfill pickup jobs for waste submissions created before this migration.
insert into pickups (waste_id, status, scheduled, address, payout)
select w.id, 'Available', w.scheduled, w.address, round(w.weight_kg * payout_rate(w.type), 2)
from waste_submissions w
where not exists (select 1 from pickups p where p.waste_id = w.id);

-- ---------- RLS ----------

alter table users enable row level security;
alter table waste_submissions enable row level security;
alter table pickups enable row level security;
alter table inventory enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;

-- Users: own profile, admin, and basic collector profiles visible to authenticated users.
drop policy if exists "read own or admin" on users;
drop policy if exists "insert own on signup" on users;
drop policy if exists "update own" on users;
create policy "read profiles" on users for select using (
  auth.uid() = auth_id or is_admin() or (auth.role() = 'authenticated' and role = 'collector')
);
create policy "update own profile" on users for update
using (auth.uid() = auth_id)
with check (auth.uid() = auth_id);

-- SECURITY: the policy above only checks row ownership, not which columns
-- changed. Without the column-level revoke below, a signed-in user could
-- call supabase.from('users').update({ role: 'admin' }) directly from the
-- browser and promote themselves, or credit their own wallet/points.
-- Revoking UPDATE on these specific columns from the client role blocks
-- that, while leaving name/location editable. This does NOT affect
-- accept_pickup/confirm_pickup/place_order above: those are `security
-- definer` functions, so they run as the function owner (not as the
-- logged-in client) and are unaffected by this grant.
revoke update (role, wallet, points) on users from authenticated;
grant update (name, location, vehicle) on users to authenticated;

-- Waste: generator sees own; assigned collectors see their jobs; processors/admin see collected feedstock.
drop policy if exists "read waste submissions" on waste_submissions;
drop policy if exists "insert own waste submission" on waste_submissions;
drop policy if exists "update own waste submission" on waste_submissions;
create policy "read relevant waste" on waste_submissions for select using (
  user_id = current_profile_id()
  or is_admin()
  or (current_user_role() = 'processor' and status = 'Collected')
  or collector_has_waste(waste_submissions.id)
);
create policy "insert own waste" on waste_submissions for insert
with check (user_id = current_profile_id());

-- Pickup jobs: available jobs to collectors; assigned jobs to collector; generator sees own; admin/processor can inspect.
drop policy if exists "read pickups" on pickups;
drop policy if exists "update pickups" on pickups;
drop policy if exists "insert pickups" on pickups;
create policy "read relevant pickups" on pickups for select using (
  is_admin()
  or (current_user_role() = 'processor')
  or collector_id = current_profile_id()
  or (
    status = 'Available'
    and current_user_role() = 'collector'
  )
  or owns_waste(pickups.waste_id)
);
create policy "collector updates assigned pickup" on pickups for update
using (is_admin() or collector_id = current_profile_id())
with check (is_admin() or collector_id = current_profile_id());

-- Inventory: processors/admins.
drop policy if exists "public read inventory" on inventory;
drop policy if exists "processor writes inventory" on inventory;
create policy "read inventory" on inventory for select using (is_admin() or current_user_role() = 'processor');
create policy "write inventory" on inventory for all
using (is_admin() or current_user_role() = 'processor')
with check (is_admin() or current_user_role() = 'processor');

-- Products are publicly browsable; only processors/admins can manage.
drop policy if exists "public read products" on products;
drop policy if exists "processor writes products" on products;
create policy "public read products" on products for select using (true);
create policy "manage products" on products for all
using (is_admin() or current_user_role() = 'processor')
with check (is_admin() or current_user_role() = 'processor');

-- Orders: owner or processor/admin. Client inserts are blocked; RPC creates orders.
drop policy if exists "read own orders or staff" on orders;
drop policy if exists "insert own order" on orders;
drop policy if exists "staff update orders" on orders;
create policy "read own orders or staff" on orders for select using (
  user_id = current_profile_id() or is_admin() or current_user_role() = 'processor'
);
create policy "staff update orders" on orders for update
using (is_admin() or current_user_role() = 'processor')
with check (is_admin() or current_user_role() = 'processor');

-- Payments: owner or admin.
drop policy if exists "read own payments or admin" on payments;
create policy "read own payments or admin" on payments for select using (
  is_admin() or exists (
    select 1 from orders o where o.id = payments.order_id and o.user_id = current_profile_id()
  )
);

-- Messages: participants.
drop policy if exists "read own messages" on messages;
drop policy if exists "send messages" on messages;
create policy "read own messages" on messages for select using (
  sender_id = current_profile_id() or recipient_id = current_profile_id()
);
create policy "send messages" on messages for insert
with check (sender_id = current_profile_id());

-- Notifications: owner only.
drop policy if exists "read own notifications" on notifications;
create policy "read own notifications" on notifications for select using (user_id = current_profile_id());

-- Starter marketplace products.
insert into products (name, category, price, stock, blurb)
select * from (values
  ('Biochar (5kg bag)', 'Soil amendment', 2500, 140, 'Slow-release soil conditioner from pyrolyzed crop residue.'),
  ('Synergy Oil (5L)', 'Fuel', 6200, 60, 'Refined pyrolysis oil for generators and diesel engines.'),
  ('Bio-LPG Cylinder (12.5kg)', 'Cooking fuel', 9800, 35, 'Biogas-derived cooking gas, refillable cylinder exchange.'),
  ('Organic Fertilizer (25kg)', 'Fertilizer', 4300, 210, 'Nutrient-dense digestate fertilizer for smallholder farms.')
) as v(name, category, price, stock, blurb)
where not exists (select 1 from products);

-- ---------- audit log ----------
-- Lightweight audit trail for the money- and job-moving events, so an
-- admin can answer "what happened to this pickup / order / wallet" later.
-- This is intentionally append-only: no update/delete policy is defined,
-- so rows can't be edited or erased via the client even by an admin.

create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  event text not null,
  actor_id uuid,
  subject_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table audit_log enable row level security;
drop policy if exists "admin reads audit log" on audit_log;
create policy "admin reads audit log" on audit_log for select using (is_admin());

-- Record every completed pickup payout and every placed order automatically.
create or replace function log_pickup_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Completed' and old.status is distinct from 'Completed' then
    insert into audit_log (event, actor_id, subject_id, detail)
    values ('pickup_confirmed', new.collector_id, new.id,
      jsonb_build_object('payout', new.payout, 'waste_id', new.waste_id));
  end if;
  return new;
end;
$$;

drop trigger if exists after_pickup_confirmed_audit on pickups;
create trigger after_pickup_confirmed_audit
after update on pickups
for each row execute procedure log_pickup_confirmed();

create or replace function log_order_placed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (event, actor_id, subject_id, detail)
  values ('order_placed', new.user_id, new.id,
    jsonb_build_object('product_id', new.product_id, 'qty', new.qty, 'total', new.total));
  return new;
end;
$$;

drop trigger if exists after_order_placed_audit on orders;
create trigger after_order_placed_audit
after insert on orders
for each row execute procedure log_order_placed();

-- Promote an existing account to admin after signup:
-- update public.users set role = 'admin' where auth_id = '<AUTH USER UUID>';
