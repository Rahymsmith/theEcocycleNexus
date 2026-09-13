# EcoCycle Nexus — Real MVP Setup

This version is designed for a pitch-ready MVP with real multi-user data.

## What is real

- Supabase email/password authentication
- Email magic-link login
- Automatic user profile creation
- Individual waste submissions
- Automatic pickup job creation
- Collector job acceptance
- Atomic pickup confirmation and collector payout
- Generator Green Points
- Processor incoming waste visibility
- Real marketplace products and stock
- Multi-item orders
- Pay-on-delivery MVP order recording
- Order status progression
- Admin live counts and operations lists
- Row-level database permissions
- Database indexes for growth

## 1. Create/configure Supabase

Create a Supabase project.

In Supabase:
1. Open SQL Editor.
2. Create a new query.
3. Paste the entire `supabase/schema.sql`.
4. Run it.
5. In Authentication > Providers, enable Email.
6. Decide whether email confirmation is required. The schema supports either setting.

## 2. Get the frontend keys

From Supabase Project Settings > API, copy:
- Project URL
- Publishable/anon frontend key

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_FRONTEND_KEY
```

Never put a Supabase service-role key in this frontend.

## 3. Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints.

## 4. Test the full MVP

Create:
- one Individual account
- one Collector account
- one Processor account

Then test:

Individual:
1. Submit waste.
2. Select a pickup time.
3. Check Pickup Tracking.

Collector:
1. Open Job Board.
2. Accept the new pickup.
3. Open Confirm Collection.
4. Enter the collected weight.
5. Confirm.

Individual:
1. Refresh.
2. Confirm pickup is completed.
3. Check Green Points.

Processor:
1. Open Incoming Waste Log.
2. Confirm collected waste is visible.
3. Open Marketplace.

Individual:
1. Add a product.
2. Open Cart & Checkout.
3. Place an order.
4. Open Order Tracking.

Admin:
1. Promote one existing account using the SQL comment at the bottom of `schema.sql`.
2. Sign in again.
3. Open Operations dashboard.

## 5. Deploy to Vercel

Add these two environment variables to the Vercel project:

`VITE_SUPABASE_URL`
`VITE_SUPABASE_ANON_KEY`

Redeploy after saving them.

## Important MVP limitation

Marketplace checkout is intentionally **Pay on Delivery** in this version. The order, stock reservation, and payment record are real database records, but no card/USSD charge is taken automatically yet.

For the pitch, describe this as:
"Marketplace ordering is live in the MVP; online payment integration is the next commercial integration."

Do not claim that Paystack/card payments are live until a Paystack merchant account and secure server-side payment flow have been connected.

## Scaling direction

The database is indexed and uses atomic functions for job assignment, pickup confirmation, and stock reservation. That is enough to demonstrate a credible multi-user MVP and gives a clean base for expansion beyond the first 1,000 users.

For a production launch after the pitch, add:
- verified business/collector onboarding
- server-side payment webhook verification
- SMS/WhatsApp notifications
- map/geocoding provider
- audit logs
- monitoring/error tracking
- backups and recovery testing
- stronger operational/admin permissions
