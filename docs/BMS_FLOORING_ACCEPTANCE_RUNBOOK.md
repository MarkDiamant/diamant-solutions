# Flooring Demo acceptance execution guide

## Live acceptance layers

1. **Public production HTTP**: GET `/api/bms-demo/flooring-data` and `/flooring/operations`, assert fictional catalogue, coverage, customer-specific pricing and server rendering. Verify anonymous and cross-origin POST rejection. These checks have executed from a restricted Vercel sandbox, not from an authenticated browser.
2. **Rollback-only database integration**: Run `tests/flooring-full-order-to-invoice.sql`, `tests/flooring-demo-transactional-reset.sql`, `tests/bms-plan-delivery-idempotency.sql`, `tests/bms-quote-revisions-tenant-idempotency.sql`, `tests/bms-internal-draft-invoice-once.sql`, `tests/bms-customer-idempotent-tenant.sql` and `tests/bms-enquiry-cross-tenant.sql` under service role. All seven were executed successfully on 27 October 2026. No data persists because each wraps in BEGIN/ROLLBACK.
3. **Authenticated browser**: Run protected `BMS Flooring Acceptance` GitHub Actions workflow with a dedicated manager test session. Create protected environment `bms-acceptance` and provide either a short-lived `BMS_TEST_ACCESS_TOKEN` or protected `BMS_TEST_EMAIL`, `BMS_TEST_PASSWORD` and `BMS_TEST_SUPABASE_PUBLISHABLE_KEY` secrets. Create the test identity through supported Supabase Auth administration and assign an **active manager membership only to the fictional `flooring-showcase-demo` tenant**, never M&J or any live financial tenant. Do not insert authentication records directly into `auth.users`. Never commit tokens, export traces with cookies, or use an unrelated live user's session. The test does not manufacture credentials.
4. **Mutation acceptance**: Manually dispatch the workflow with `run_mutations=true` only after confirming the fictional demo is not in use. It creates a fictional customer, verifies persistence, and invokes the guarded transactional reset. Reset is destructive **only within the fictional showcase**. The gated browser scenario now attempts customer creation, enquiry, quotation, sales order, purchase order, delivery planning, draft invoicing, receipt, reservation, picking, delivery confirmation and reset. It has **not been executed or accepted**; additional assertions for returns, pricing overrides and mobile interactions remain necessary.

## Evidence and blockers

- Demo hostname does not have a live tenant context. Write endpoint now checks a verified Supabase auth identity against active BMS manager memberships; it never accepts a client tenant ID for writes.
- The dedicated manager account, protected credentials and authenticated browser execution remain outstanding. The current production database has **zero active manager memberships in the fictional demo tenant**. The write endpoint accepts a verified active manager membership in an active tenant, including a demo-only membership; it never derives the write target from that membership. A Vercel sandbox **can run real Chromium/Playwright**. The earlier attempt failed due to restricted npm registry DNS and missing native browser libraries. A later ephemeral Amazon Linux 2023 sandbox with outbound network access installed Playwright and Chromium, then installed browser dependencies using sudo dnf. The exact public suite ran successfully against production (8/8 passed). Stop the sandbox after testing. GitHub Actions remains the protected environment for authenticated tests and credentials.
- The Next.js build is configured to ignore TypeScript build errors. READY does not establish type safety or user-facing acceptance. Treat browser, mobile, permission, retry and tenant isolation checks as separate gates.
- Use `docs/BMS_REQUIREMENT_ACCEPTANCE_METRICS.md` for strict all-or-nothing acceptance percentages. Do not count partial work as complete.

## Reproducible sandbox browser procedure (public tests only)

Create a short-lived Vercel sandbox scoped to the BMS project with Node 22, region London and temporary outbound access for npm/Chromium installation. **Never inject live user tokens or financial credentials into a public-test sandbox.** Run:

~~~sh
npm install --no-save --ignore-scripts @playwright/test@1.56.1 playwright@1.56.1 typescript@5.9.3
npx playwright install chromium
sudo dnf install -y nss nspr atk at-spi2-atk cups-libs libXcomposite libXdamage libXrandr mesa-libgbm pango alsa-lib libxkbcommon libXfixes libXext libX11 libxcb
npx playwright test --grep-invert authenticated
~~~

Ensure the repository Playwright config and tests/e2e/flooring.spec.ts are present in the sandbox. This command excludes authenticated tests, which must be run separately using protected CI credentials. On 27 October the exact public suite passed **8/8**, including responsive pricing, reset guard, mobile keyboard controls, denied writes, Worker Portal and Labour Costing error handling. The shared brand nested-anchor hydration error was also fixed and independently verified across three production routes. Always stop the sandbox after use.

## Latest full verification
- Public Chromium suite: **12/12 passed** after demo write Origin regression. Node/React/security suite: **18/18 passed**. Rollback-only SQL integration: **13/13 passed**.
- Production Next.js build now enforces TypeScript checking and passes; npm audit 0 vulnerabilities. Authenticated manager tests still require a dedicated, active account of the fictional tenant with credentials stored only in the protected GitHub Actions environment.
