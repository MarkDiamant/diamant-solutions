# BMS launch acceptance execution, 5 November 2026

## Execution environment
Vercel sandbox (Ubuntu, Chromium Playwright), cloned from production GitHub main, with no production database write credentials, no live payment actions and no customer email dispatch. The checks below are executed tests, not assertions inferred from source.

## Results
- Node regression suite: **314 passed, 0 failed** (node --test tests/*.test.cjs tests/*.test.mjs).
- Chromium Playwright: **32 passed, 4 skipped, 0 failed** across tests/bms-launch-smoke.spec.ts, tests/bms-launch-extended.spec.ts, tests/e2e/flooring.spec.ts, and tests/e2e/flooring-manager-acceptance.spec.ts.
- Skipped tests: two authenticated fictional manager customer/job/PDF workflows in flooring-manager-acceptance.spec.ts and two authenticated fictional manager rendering/customer-write/reset workflows in flooring.spec.ts. These require a provisioned, authorized fictional manager account/session and a dedicated isolated tenant.
- Browser tests exercised live public site and fictional Flooring Demo, responsive navigation, catalogue privacy, anonymous write denial, domain-origin protections, onboarding auth gates, and shared navigation.
- Signed Stripe webhook handler exercised with isolated fake Stripe responses and fake Supabase RPC: signature rejection, timestamp expiry, paid seat invoice, unpaid invoice, seat mismatch, invoice pagination fail-closed, unrelated subscription rejection, payment failure, cancellation, subscription updates and RPC retry behavior. No Stripe network events were sent and this is **not** a live webhook-delivery test.
- Activation email handler exercised with isolated fake Resend, DNS and database: approved owner gate, tenant domain validation, idempotency, already-sent handling, provider failure, DB marking failure and retry. No actual email sent.
- Xero integration handler exercised with isolated fake Xero and database: missing connection/scope, token refresh and persistence, invoice GET, API errors and transient rate-limit retry. No sandbox OAuth login or actual Xero API call executed.
- Browser authenticated onboarding customer account creation, autosave and resume, conditional questions, approval, module visibility and first login: **not fully executable** without an authorized fictional account, real isolated paid-state fixture and test tenant. Anonymous auth/route gates were exercised.
- Wildcard Vercel domain registered as `*.diamantsolutions.co.uk` with expected CNAME `cname.vercel-dns.com.`, no reported conflicts. GoDaddy user reports adding Host `*`, Value `cname.vercel-dns.com`, TTL 1 hour. Latest Vercel config still reports `misconfigured: true`; do not claim DNS verification until that changes.
- Production deployment `dpl_6PQPdrj8f3iG6d1BRLhaUg9RnL5Z` at `4f21efeb40b2ed900c3e39e189733509927b377e` reports READY and aliases include both `bms.diamantsolutions.co.uk` and `mjmetal.diamantsolutions.co.uk`.

## Outstanding genuine external acceptance gates
1. Wait for authoritative wildcard DNS propagation and Vercel verification. If still misconfigured after TTL, inspect GoDaddy authoritative wildcard response and verify the record is in the active DNS zone.
2. Provision isolated fictional manager and customer accounts, an authorized test mailbox and an isolated test tenant; execute the four skipped authenticated Playwright tests and full onboarding create/save/resume/approval/first-login journey.
3. Deliver signed Stripe **test-mode** events to the configured webhook endpoint and confirm webhook deliveries, payment-failure/cancellation state transitions and seat upgrade idempotency. Do not create live charges.
4. Test authorized Resend mailbox welcome/onboarding invite delivery and delivery failure/retry using a non-customer test recipient.
5. Complete Xero demo-company sandbox OAuth and invoice/payment simulation with authorized sandbox credentials; no live tenant or production account mutations.
