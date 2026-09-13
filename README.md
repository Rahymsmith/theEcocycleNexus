# EcoCycle Nexus

Circular bioeconomy / waste-to-energy platform for Ikorodu, Lagos.
Three roles - Waste Generator, Waste Collector, Processing Partner -
plus an Admin operations view, built with React, Vite, Tailwind, and
Supabase (Auth + Postgres).

## Two modes, same codebase

- **Demo mode** (no setup): if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  aren't set, the app runs on seeded data stored in your browser's
  localStorage. Good for pitching/screenshots. Not shared between users.
- **Live mode** (real product): once those two env vars are set, the app
  requires real sign-in and reads/writes a shared Postgres database via
  Supabase. This is what you want for actual users.

## 1. Create your Supabase project

1. Go to supabase.com -> New project. Pick a region close to Nigeria
   (e.g. an EU region) and a strong database password.
2. Once it's provisioned: **Authentication -> Providers -> Email** -
   make sure Email is enabled (it is by default). For faster testing,
   you can turn off "Confirm email" under
   **Authentication -> Settings**, but leave it on for a real launch.
3. **SQL Editor -> New query** -> paste the entire contents of
   `supabase/schema.sql` from this repo -> **Run**. This creates all
   10 tables, row-level security policies, an `is_admin()` helper, and
   seeds the four starter marketplace products.
4. **Project Settings -> API** -> copy the **Project URL** and the
   **anon public** key. You'll need both next.

## 2. Configure the app

```bash
cp .env.example .env.local
```
Paste your Project URL and anon key into `.env.local`. Then:
```bash
npm install
npm run dev
```
Sign up with a real email at `http://localhost:5173` - you now have a
real account backed by Postgres.

## 3. Make yourself an admin

Sign up once through the app first (so your `users` row exists), then
in the Supabase SQL Editor:
```sql
update users set role = 'admin'
where auth_id = (select id from auth.users where email = 'you@example.com');
```
Log out and back in - you'll see an "Admin" section in the sidebar
with live platform counts.

## 4. Put it on GitHub

```bash
git init
git add .
git commit -m "EcoCycle Nexus"
git remote add origin https://github.com/<your-username>/ecocycle-nexus.git
git branch -M main
git push -u origin main
```

## 5. Deploy - Vercel

1. vercel.com -> sign in with GitHub -> Add New -> Project -> import
   your repo.
2. It auto-detects Vite (build: `npm run build`, output: `dist`).
3. Before deploying, add **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Every `git push` to `main` auto-redeploys.

## 5b. Deploy - Netlify (alternative)

1. netlify.com -> Add new site -> Import an existing project -> pick
   the repo.
2. Build command `npm run build`, publish directory `dist`.
3. Site configuration -> Environment variables -> add the same two
   `VITE_SUPABASE_*` values.
4. Deploy site.

## What's real vs. what's still a placeholder

**Real and working once Supabase is connected:**
- Email/password sign-up and login, magic-link login, password reset
- Role assigned at signup (individual / collector / processor), stored
  in Postgres
- Submit waste -> appears for collectors -> accept -> confirm -> wallet
  credited - all real database writes
- Marketplace purchase -> real order row -> processor can advance its
  status -> shows up in the buyer's order tracking
- Row-level security so people can only edit their own data (see
  `supabase/schema.sql`)
- Admin dashboard with live counts (users, collectors, processors,
  pending pickups, orders, total waste collected)

**Still placeholders / next steps, in rough priority order:**
1. **Payments** - the checkout button records an order but doesn't move
   real money yet. Wire the Paystack Inline JS SDK (or Checkout API)
   into `CartCheckout` in `src/screens.jsx`, using a Paystack **public**
   key on the frontend and verifying the transaction server-side
   (a Supabase Edge Function is the natural place for that secret-key
   call - never put your Paystack secret key in frontend code).
2. **SMS/phone OTP** - only email auth is wired up. Phone OTP needs a
   paid SMS provider (Twilio, Termii, etc.) connected in Supabase Auth
   settings; once you pick one, no app code changes are needed beyond
   swapping the sign-up form's field from email to phone.
3. **Messaging** - `messages`/`notifications` tables and screens exist,
   but there's no realtime push yet. Supabase Realtime subscriptions
   are a natural fit (a few lines per screen) once you're ready.
4. **Admin management screens** - the current admin view is read-only
   stats. Managing users/pickups/orders directly from the UI (ban a
   user, reassign a job) isn't built yet - do it via the Supabase Table
   Editor for now.
5. **Rate limiting / abuse prevention** - not implemented. For a public
   launch, add Supabase's built-in Auth rate limits (Project Settings)
   at minimum, and consider Cloudflare in front of the deployed site.
6. **Audit log** - important actions (role changes, order status
   changes) aren't currently logged to a separate table. Straightforward
   to add as a Postgres trigger once you know which actions matter most.

## Project structure

```
src/
  lib/
    supabaseClient.js   # Supabase client (null if env vars unset -> demo mode)
    auth.js             # signUp / signIn / OTP / password reset wrappers
    db.js               # Demo-mode data (localStorage) + seed data
    liveApi.js          # Real Supabase reads/writes, mapped to the app's data shape
    appData.js          # Picks demo vs live mode, exposes {db, actions} either way
  context/
    AuthContext.jsx     # Session + profile, available via useAuth()
  auth/
    AuthScreens.jsx     # Login / signup / magic link / forgot password UI
  screens.jsx           # All 30 screens + shared UI primitives + Admin dashboard
  Sidebar.jsx           # Role-based navigation, admin link, sign-out
  App.jsx               # Mode switch, routing, auth gating
supabase/
  schema.sql            # Tables, RLS policies, is_admin() helper, seed products
```
