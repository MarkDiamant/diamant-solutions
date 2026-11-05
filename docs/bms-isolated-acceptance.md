# Isolated BMS acceptance environment

This is a preparation guide, **not** a claim that authenticated checkout has been tested. Never use production credentials or import real client data.

## Isolation requirements
1. Create a new Supabase project, not a branch with copied production records. Apply the repository's `supabase/migrations` in chronological order, checking migration dependencies and any existing baseline first. Never point Preview at the live project.
2. In Vercel project `diamant-solutions`, configure **Preview-only** variables for the isolated project: `DS_SUPABASE_URL`, `DS_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_ANON_KEY`. Server/public URLs must match the same isolated project. Do not use production values. If the project requires other server-side secrets, generate distinct Preview-only values.
3. Create disposable user in isolated Supabase Authentication > Users > Add user. Use a test-only email and password, and confirm email in the test project. Never reuse a real customer identity.
4. In Stripe Dashboard, switch to **Test mode**. Under Developers > API keys, obtain `sk_test_...`; create **test-mode** base and seat prices (`price_...`). Under Developers > Webhooks, add the Preview endpoint `https://<preview-host>/api/stripe/bms-seats-webhook` with events `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`; copy its **test-mode** signing secret `whsec_...`. Put `STRIPE_SECRET_KEY`, `BMS_STRIPE_BASE_PRICE_ID`, `BMS_STRIPE_SEAT_PRICE_ID`, `STRIPE_BMS_SEATS_WEBHOOK_SECRET` in **Preview only**. If signup uses a separate checkout price/webhook, configure its own **test-mode** values and endpoint, not the seat webhook.
5. Use a non-main test branch to generate a Vercel Preview URL. Preview must have no production domains assigned and must not inherit any production database or billing secrets. The Vercel account currently has no custom environments; built-in Preview is sufficient if isolated.

## Local opt-in acceptance
Copy `tests/fixtures/bms-isolated-preview.env.example` to a local untracked file and fill with **test-only** values. Do not commit credentials.
Run `node scripts/bms-test-preflight.cjs` after loading test environment variables.
Run `node scripts/bms-isolated-auth-acceptance.cjs` to test real disposable Supabase password authentication, refresh-token session persistence, Preview first-login gating and cross-tenant denial. This script only sends authentication POSTs and read-only onboarding GETs. It does not create subscriptions, tenant records or invitations.
Run `npm run test:acceptance-static` for fixture-based guards and purchasing/finance tests without external credentials.

## Still requires real isolated acceptance
Provision a fictional tenant and owner membership using the supported onboarding workflow, then test signup/paid test checkout, tenant activation, invitations, role restrictions, archive and stock persistence, finance reconciliation and signed Stripe webhook replay in the isolated environment. Keep live accounts disconnected. Capture request IDs and reconcile tenant-scoped database rows; clean up only isolated test data.

## Important
A successful build and HTTP 200 do not prove authenticated acceptance. The preflight is a configuration check, not a secret-validity check; Stripe API and Supabase Auth can only be verified after isolated credentials exist. Historical VAT snapshots remain NULL by design; only newly created purchase-order lines receive VAT snapshots.
