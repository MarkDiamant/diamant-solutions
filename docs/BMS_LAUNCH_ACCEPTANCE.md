# BMS launch acceptance register (5 November 2026)

This register distinguishes **executed** checks from source/build checks and **not executed** authenticated browser checks. Do not mark onboarding complete from a READY deployment or static contract checks. Use only fictional customers and Stripe test-mode accounts for any future charge, email or lifecycle test. Never modify MJ Metal or another customer's financial, inventory, subscription or email records.

## Verified independently

- [x] Production build compiles and runs `scripts/check-bms-demo-parity.mjs` and `scripts/check-bms-launch-contracts.mjs`. These are **static source contract checks**, not browser or API execution.
- [x] SQL rollback fixtures: fictional flooring, fabrication and service onboarding, verified checkout requirement, preparation idempotency, approval, module configuration and activation. No fixture persisted.
- [x] SQL rollback fixtures: unpaid checkout rejected; cross-tenant approval rejected; duplicate business preparation rejected.
- [x] SQL rollback fixtures: verified-seat RPC paid increase, duplicate event, unpaid attempted increase, payment failure, seat reduction, cancellation. No fixture persisted. This does not validate live Stripe's actual webhook payloads or customer portal configuration.
- [x] Database financial integrity queries: invalid payment allocations, overallocated payments, inconsistent invoices, invalid customer returns and invalid stock returns all zero at check time. This is not a complete account-by-account Xero reconciliation.
- [x] Tenant-scoped read-only financial audit RPC executes on reference tenant; all five exception counts zero at check time.
- [x] Xero reconciliation API now pages internal evidence in 500-row chunks and rejects incomplete Xero pagination rather than reporting partial totals.
- [x] Fictional Xero reconciliation/sync-history fixtures implemented on demo API, with explicit simulation labels and a deliberate amount mismatch and non-customer loan receipt. **HTTP execution of these fixtures remains unverified.**
- [x] Vercel wildcard project domain registered; external wildcard DNS not configured at last check. Current application uses hostname-based tenant routing, tenant-specific cookie sessions and tenant host resolution. The existing `bms.diamantsolutions.co.uk` host is reserved for the fictional demo. Reusing a shared BMS domain securely would require an explicitly scoped path/tenant selector, host-independent session and routing refactor. Current implementation therefore requires GoDaddy CNAME `*` to `cname.vercel-dns.com` for generated tenant domains.

## Pending real authenticated browser and HTTP acceptance

1. **Fictional Stripe checkout**: choose monthly/annual plan, 1/3/10 seats; inspect Stripe test-mode session line items, customer and subscription metadata. Test failed payment, abandoned checkout and paid retry. Verify webhook signature and invoice paid verification using actual Stripe test event payloads; duplicate and out-of-order deliveries must not create tenants or increase unpaid seats.
2. **Welcome email**: receive exactly one personalised email at a fictional controlled inbox, inspect URL/token expiry, retry and wrong-email rejection. Confirm no sensitive token leaks in logs.
3. **Customer sign-in**: open magic link in clean browser, verify session and membership; wrong account, expired link and repeated link must be handled safely.
4. **Autosave/resume**: edit every page, refresh, switch devices, go offline/online, resume partial answers; verify server persistence and local fallback without cross-tenant leakage.
5. **Conditional onboarding**: verify service, flooring and fabrication choices display appropriate current BMS modules, validation, dynamic progress, branding upload and selected seats.
6. **Submission/review**: verify paid-only submission, internal notification, reviewer-only dashboard, clarification request, resubmission, concurrent reviewer conflict and complete audit trail.
7. **Configuration/approval**: verify prepared tenant remains suspended; confirm module dependencies, branding, units, permissions, warehouse defaults, invoice settings, owners, seats and data imports. Approve only after payment and internal review; ensure failed approval leaves tenant suspended.
8. **Activation email and first login**: after approval, confirm active owner account, deliverable tenant domain, idempotent activation email, login URL and successful owner login. Verify other users' invitation and seat limits.
9. **Navigation and authorization**: hidden modules must disappear from desktop/mobile menu and return 403 from every relevant GET/POST/PUT/PATCH/DELETE endpoint; role restrictions and cross-tenant data isolation must hold.
10. **Flooring Demo UI/API**: open `/flooring` on demo domain, test all modules including Price Book, stock, purchasing, goods received, sales orders, deliveries, returns, money, campaigns and fictional Xero reconciliation; verify no live API mutation or Northstar branding leakage.
11. **Xero simulation**: execute demo reconciliation endpoint over HTTP; confirm invoice payment matching, mismatched amounts, director-loan exclusion, spend classifications, read-only status and simulated disconnected Xero. Separately test OAuth token refresh and pagination in an isolated Xero sandbox before real integration.
12. **Finance acceptance**: compare fictional job materials, labour, stock consumption/returns, customer refunds, VAT, invoice payments, credit notes and money overview to an independent expected ledger. Confirm no double counting of Xero bank receipts and invoice payments.

## Automated browser smoke tests

`tests/bms-launch-smoke.spec.ts` contains fictional demo browser/API and unauthenticated security tests. `.github/workflows/bms-launch-smoke.yml` is configured to execute them on GitHub Actions. A workflow run must be observed and pass before recording these tests as executed. Do not infer success merely because the files exist. Authenticated scenarios above additionally require test-mode Stripe, controlled mailbox, test credentials and a resolvable tenant domain (or a separately implemented secure shared-domain architecture).
