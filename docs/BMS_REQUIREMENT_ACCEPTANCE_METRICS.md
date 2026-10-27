# BMS requirement acceptance metrics

Baseline: commit `1501effb`. Current evidence snapshot: baseline `1f741ea5` plus verified subsequent source changes, SQL migrations and production HTTP checks through 27 October 2026. Scope: the **20 top-level requirements** already listed in `docs/BMS_MASTER_COMPLETION_CHECKLIST.md`. No new requirements silently added to the denominator.

**Counting rules:** Implemented = all named scope for a requirement is in source code (even when not user-accepted); automated integration tested = the *complete named requirement* has an executed repeatable test (database rollback, HTTP/browser or React rendering, as appropriate), not merely one sub-feature; authenticated E2E accepted = logged-in real browser actions and persisted results plus role/mobile gates where applicable. Partial work is recorded in notes but contributes **zero** to the completed stage. Each row counts once, regardless of effort. These are **unweighted requirement coverage ratios, not effort completed, product readiness or business value**. No estimated effort-weighted percentage is asserted.

| Gate | Baseline 1501effb | Current | Change |
|---|---:|---:|---:|
| Requirements in scope | 20 | 20 | 0 |
| Fully implemented | 9/20 (45.0%) | 10/20 (50.0%) | +1 requirement |
| Complete requirement automated integration tested | 4/20 (20.0%) | 10/20 (50.0%) | +6 requirements |
| Authenticated browser E2E accepted | 0/20 (0%) | 0/20 (0%) | 0 |

| # | Requirement | Baseline implemented | Baseline tested | Current implemented | Current tested | Browser accepted | Evidence / outstanding |
|---:|---|:---:|:---:|:---:|:---:|:---:|---|
| 1 | Shared tenant-aware design tokens | Yes | Yes | Yes | Yes | No | Shared CSS, BmsUI and navigation regression |
| 2 | Shared page/header/card/form/table/modal/badge primitives | Yes | No | Yes | Yes | No | All shared primitives rendered and asserted in 3/3 real React server-render tests; consumer migration is separate requirement #3. Authenticated browser acceptance remains open. |
| 3 | Every BMS page migrated to central components | No | No | No | No | No | Outstanding pages and responsive QA |
| 4 | Demo banner and industry selector | Yes | No | Yes | Yes | No | Live Playwright verified banner, seven-industry selector, switching back and forth, sidebar at mobile and desktop. Authenticated browser acceptance remains open. |
| 5 | Mobile header/New Job/Ruby original image | Yes | No | Yes | Yes | No | Live Playwright verified original Ruby portrait loaded at 320/390/768, mobile header and keyboard New Job menu. Authenticated browser acceptance remains open. |
| 6 | Flooring fictional tenant isolation and seed | Yes | Yes | Yes | Yes | No | Seed and rollback tenant-isolation SQL |
| 7 | Flooring catalogue, coverage, customer prices | Yes | Yes | Yes | Yes | No | Connected flooring SQL and customer-specific price tests |
| 8 | Flooring PO/receipt/reserve/pick/return | Yes | Yes | Yes | Yes | No | Rollback-only warehouse and order workflow |
| 9 | Flooring interactive persisted actions | Yes | No | Yes | Yes | No | Post-baseline full workflow rollback test; no authenticated API |
| 10 | Flooring connected website catalogue preview | Yes | No | Yes | Yes | No | Live Playwright compared four privacy-filtered public catalogue records with connected operations UI after data hydration. Authenticated browser acceptance remains open. |
| 11 | Flooring guarded transactional reset | No | No | Yes | Yes | No | Reset-after-full-workflow rollback SQL passed; browser reset still unverified |
| 12 | Flooring quotation, invoice and accounting | No | No | No | No | No | Source-quote FK and retry collision SQL passed; external accounting scope incomplete |
| 13 | Master purchasing, sales, stock and logistics | No | No | No | No | No | Partial integration, full scope incomplete |
| 14 | Ruby document-to-confirmed actions | No | No | No | No | No | Document/permission/idempotency acceptance missing |
| 15 | Worker Portal, timesheets, labour billing | No | No | No | No | No | Overnight/DST worker-hour unit tests passed locally; role matrix and billing acceptance missing |
| 16 | QuickBooks integration | No | No | No | No | No | Authorised provider acceptance missing |
| 17 | Xero, Money Overview and reconciliation | No | No | No | No | No | Tenant-scoped 180s sync lease SQL passed; historical Xero errors remain, reconciliation unaccepted |
| 18 | Quotation versioning, lead time and PDF | No | No | No | No | No | Atomic version and invoice source-quote SQL passed; PDF scope unverified |
| 19 | Tenant isolation and financial safety | No | No | No | No | No | Partial rollback SQL, role matrix outstanding |
| 20 | Desktop/tablet/mobile usability | No | No | No | No | No | Authenticated responsive QA outstanding |

**Blockers:** No authenticated interactive browser session or verified test-user credentials available to the connected tools. Historical Vercel READY deployments prove successful compilation only; Next build skips type checking. Live provider integrations require authorised consent. No MJ010 financial changes authorised. The source checklist and individual tests remain the authority for details; update this ledger only when complete-gate evidence is added.

## Subsequent verified evidence (27 October 2026)

- **Production API:** Public fictional website catalogue `/api/bms-demo/catalogue` returned HTTP 200 with four products and only public list-price, coverage and SKU fields. No customer prices, supplier costs, customer IDs or contact details were exposed. The separate full demo snapshot also returned HTTP 200. This does not prove authenticated browser rendering.
- **Flooring:** `5102a85f` full-workflow-then-reset rollback SQL passed; newly created job, sales/purchase orders, delivery and invoice were removed and the original fictional baseline restored. `708260ac` added optional `source_quote_id` to new internal invoices; `e8e5624e` passed source-quote traceability and conflicting same-total retry rejection. No historical invoice totals changed. `e78fc27a` fixed the demo UI's handling of UUID-returning sales/purchase RPCs, ensuring subsequent warehouse/delivery actions target the new order lines. UI acceptance pending.
- **Accounting:** `2e9d43a7` added atomic 180-second per-tenant/per-provider accounting-sync leases, `5b2a0555` uses the lease to throttle manual Xero sync. `f489e598` rollback-only test passed including a second temporary fictional tenant and separate Xero/QuickBooks leases. `e6d2a872` restricted QuickBooks connection status to finance/settings permissions. Actual provider acceptance pending.
- **Worker:** `c3ce18d4` fixed overnight and DST day-hour display. Five Node unit cases passed locally for normal, overnight, UK spring/autumn DST and invalid intervals; `421663ec` added an automatic GitHub workflow. Payroll/billing acceptance pending.
- **Design:** `c6fb988f` migrated shared Job Detail cards, labels, buttons and accent colours; `026042ea` scoped sticky header styles to application chrome instead of page/modal headers. Browser responsive and accessibility checks still pending.
- **Browser:** Protected Playwright workflow exists but was not executed with an authenticated manager. Demo tenant has no existing active manager membership, and no dedicated test credentials were available. Never fabricate login credentials or grant a test account access to live financial tenants. A Vercel sandbox provided HTTP checks, not Chromium browser acceptance.

**Strict gates unchanged:** implemented **9/20 → 10/20 (45% → 50%)**, complete database/integration-tested **4/20 → 6/20 (20% → 30%)**, authenticated browser accepted **0/20 → 0/20 (0% → 0%)**. These remain unweighted complete-scope counts. New subfeature tests do not promote a partially completed top-level requirement.

## Independent public-browser smoke gate (not authenticated E2E)

- **6/6 public Playwright tests passed** in real headless Chromium against production on 27 October 2026. This separately measures public rendering, mobile responsive layout, catalogue privacy, keyboard navigation and denied unauthenticated writes. It is not one of the 20 full-requirement gates.
- **3/3 routes free of hydration errors** after the shared header nested-anchor fix: root, Flooring Demo operations and BMS runtime. Earlier React #418 errors were reproduced and then resolved in production.
- **Authenticated E2E: 0/20 accepted.** A dedicated demo-only Supabase Auth manager identity, protected CI credentials and execution of the opt-in write/reset browser suite are still missing. Do not substitute public browser smoke for authenticated permission/persistence acceptance.

## Expanded executed browser smoke (latest 27 October run)

- **8/8 public Playwright tests passed** in a real Chromium runner against production. New checks cover exact reset confirmation, and safe Worker Portal/Labour Costing fallback without false save claims.
- Public browser investigation uncovered real React crashes in demo worker/labour routes (undefined entries.filter and noniterable budgets). Shared-master commits f4a6715a, e4034187, 016d2383 and eef8c9b6 normalised or rejected incomplete demo API payloads. Re-tested both routes: HTTP 200, expected headings and clear unavailable messages, no uncaught browser errors or horizontal overflow.
- **Authenticated E2E remains 0/20** until a dedicated active demo manager account and protected credentials permit real write/persistence/reset acceptance. Do not count public tests as authenticated.

## 27 October full-gate re-audit against actual code and production

**Previous snapshot → evidence-adjusted current:** fully implemented **10/20 (50%) → 10/20 (50%)**; complete automated integration tested **6/20 (30%) → 10/20 (50%)**; authenticated end-to-end accepted **0/20 (0%) → 0/20 (0%)**.

**Newly completed test gates (not new implementations):** #2 shared UI primitives, 3/3 React-rendered semantic/ARIA/variant tests; #4 fictional demo banner and seven-industry navigation, executed Chromium desktop/mobile switching and sidebar; #5 mobile header, keyboard New Job menu and original loaded Ruby portrait at 320/390/768; #10 public flooring website catalogue, executed Chromium comparison with connected UI and four privacy-filtered API products. Latest **11/11 public Playwright tests** passed. These requirements were already implemented; tests now justify promoting their integration-test column. They are not authenticated E2E accepted.

**Unchanged complete gates:** #1 shared design tokens, #6 isolated fictional seed, #7 flooring coverage and customer pricing, #8 warehouse purchasing/receiving/reserving/picking/returns, #9 persisted-action RPC integration and #11 transactional fictional reset. Each has prior executed evidence. No complete implementation gate beyond these ten has been substantiated.

**Remaining all-or-nothing implementation blockers, by requirement:** #3 all pages not yet migrated and visually accepted; #12 external accounting connection/acceptance for flooring invoices; #13 all shared purchasing, stock, sales and logistics workflows not role-tested; #14 Ruby document types, permission and confirmed-action matrix not accepted; #15 Worker Portal, timesheets and labour billing not end-to-end accepted; #16 QuickBooks authorised OAuth/provider acceptance; #17 Xero provider reconciliation and Money Overview acceptance, including historical exception review; #18 full quotation lead-time/PDF/version acceptance; #19 complete tenant-role isolation and financial safety matrix; #20 complete desktop/tablet/mobile application acceptance. Partial work on each remains in the source checklist and does not count as complete.

**Security and compilation audit:** Corrected fictional demo manager permission from any active tenant to **active manager of the fictional tenant only**; required same-origin HTTPS for demo cookie writes. The fictional tenant still has **zero active managers**, so protected authenticated tests cannot execute without a dedicated identity. Repaired shadowed global URL constructor in shared accounting/materials APIs, Ruby confirmation state, erroneous invoice labour inputs, and invalid Gmail route exports. Enabled repeatable TypeScript diagnostics; shared/current application typecheck passed. The unreferenced legacy MJ-only module `lib/crm/user-access.ts` is explicitly excluded rather than modified without the required separate confirmation. Upgraded Next 15.5.24 to 15.5.28 and PostCSS to 8.5.32; dependency audit reported zero vulnerabilities after the update, and Next 15.5.28 production build passed in isolated sandbox before the later Gmail extraction. Subsequent commits must still reach READY and receive final smoke verification. MJ010 financial records remain untouched.
