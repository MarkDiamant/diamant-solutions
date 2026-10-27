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

**Newly completed test gates (not new implementations):** #2 shared UI primitives, 3/3 React-rendered semantic/ARIA/variant tests; #4 fictional demo banner and seven-industry navigation, executed Chromium desktop/mobile switching and sidebar; #5 mobile header, keyboard New Job menu and original loaded Ruby portrait at 320/390/768; #10 public flooring website catalogue, executed Chromium comparison with connected UI and four privacy-filtered API products. Latest **12/12 public Playwright tests** passed. These requirements were already implemented; tests now justify promoting their integration-test column. They are not authenticated E2E accepted.

**Unchanged complete gates:** #1 shared design tokens, #6 isolated fictional seed, #7 flooring coverage and customer pricing, #8 warehouse purchasing/receiving/reserving/picking/returns, #9 persisted-action RPC integration and #11 transactional fictional reset. Each has prior executed evidence. No complete implementation gate beyond these ten has been substantiated.

**Remaining all-or-nothing implementation blockers, by requirement:** #3 all pages not yet migrated and visually accepted; #12 external accounting connection/acceptance for flooring invoices; #13 all shared purchasing, stock, sales and logistics workflows not role-tested; #14 Ruby document types, permission and confirmed-action matrix not accepted; #15 Worker Portal, timesheets and labour billing not end-to-end accepted; #16 QuickBooks authorised OAuth/provider acceptance; #17 Xero provider reconciliation and Money Overview acceptance, including historical exception review; #18 full quotation lead-time/PDF/version acceptance; #19 complete tenant-role isolation and financial safety matrix; #20 complete desktop/tablet/mobile application acceptance. Partial work on each remains in the source checklist and does not count as complete.

**Security and compilation audit:** Corrected fictional demo manager permission from any active tenant to **active manager of the fictional tenant only**; required same-origin HTTPS for demo cookie writes. The fictional tenant still has **zero active managers**, so protected authenticated tests cannot execute without a dedicated identity. Repaired shadowed global URL constructor in shared accounting/materials APIs, Ruby confirmation state, erroneous invoice labour inputs, and invalid Gmail route exports. Enabled repeatable TypeScript diagnostics; shared/current application typecheck passed. The unreferenced legacy MJ-only module `lib/crm/user-access.ts` is explicitly excluded rather than modified without the required separate confirmation. Upgraded Next 15.5.24 to 15.5.28 and PostCSS to 8.5.32; dependency audit reported zero vulnerabilities after the update, and Next 15.5.28 production build passed in isolated sandbox before the later Gmail extraction. Subsequent commits must still reach READY and receive final smoke verification. MJ010 financial records remain untouched.

### Final executable verification after security fixes

- **12/12** public Chromium Playwright tests passed against production, including the new negative tests for missing/cross-origin cookie writes; **18/18** Node/React/source regression tests passed; **13/13** rollback-only SQL integration scripts passed without committing fictional or live financial changes.
- Next 15.5.28 build passed with TypeScript checking **enabled**, `npx tsc --noEmit` passed (excluding explicitly documented unused legacy MJ-only file), and `npm audit` reported **0 vulnerabilities** including development dependencies. All relevant production deployments through `7e242a36` reached READY; no error-level production runtime logs in the checked 30-minute window.
- Strict gates remain **10/20 implemented, 10/20 fully integration tested, 0/20 authenticated E2E**. No further gate promotion is justified by negative unauthenticated browser tests.

## 27 October CI failure root-cause and verification

- GitHub Actions unit workflow failed before job scheduling on multiple commits because its path filter used an unescaped literal Next.js catch-all segment `app/api/bms-live/[...path]/route.ts`; GitHub's event annotation explicitly reported `push event contained invalid paths patterns`. Commit `e3c4fe10` replaces it with the valid glob `app/api/bms-live/**/route.ts`, retaining all unit tests. GitHub Actions run 40470940404: **SUCCESS**, job worker-time executed.
- Payment safety run 40466365407 executed 61 assertions and failed three after deliberate architectural changes: shared `BmsCard`/`BmsButton` components replacing raw CSS, fictional manager-protected writes replacing a read-only demo, and central `safeCsvCell` replacing inline CSV quoting. Assertions were updated to require equivalent or stronger controls, not skipped. GitHub Actions run 40470770140: **SUCCESS**. Independent runner confirmed **61/61** payment/navigation and **18/18** unit tests passed.
- This CI repair does not constitute authenticated E2E acceptance or completion of another top-level requirement. Strict scores remain **implemented 10/20 (50%)**, **complete automated integration tested 10/20 (50%)**, **authenticated E2E 0/20 (0%)**. No MJ010 historical financial writes.

## 27 October 2026 measured continuation at 7bc85699

**Authoritative denominator remains 20.** Requirement IDs #1 through #20 and the strict all-or-nothing gates above remain unchanged. The earlier per-row current evidence was checked against the latest repository and deployment states; none of the new inventory or dashboard changes establishes complete implementation of a previously incomplete top-level requirement.

| Gate | Count | Percentage | Evidence rule |
|---|---:|---:|---|
| Fully implemented top-level requirement | 10/20 | 50% | Entire named scope in source; partial endpoints, tables or CSS do not qualify |
| Fully integration-tested top-level requirement | 10/20 | 50% | Executed complete-workflow tests; isolated unit tests alone do not qualify |
| Authenticated browser accepted | 0/20 | 0% | Real logged-in workflow, persisted effects and applicable role/mobile gates |

**These are unweighted scope coverage metrics, not an estimate of effort remaining or production readiness.** Each requirement has equal weight; partial features contribute zero. Acceptance is separately counted, never inferred from READY.

| Requirement | Evidence-based stage | Recent evidence and outstanding gate |
|---|---|---|
| #1 Shared design tokens | Implemented and deployed, integration tested; awaiting authenticated acceptance | Tenant-aware CSS and shared primitives |
| #2 Shared UI primitives | Implemented and deployed, integration tested; awaiting authenticated acceptance | React rendering tests |
| #3 All pages migrated | Partial | Legacy components and authenticated page-by-page QA |
| #4 Demo selector and banner | Implemented and deployed, integration tested; awaiting authenticated acceptance | Public Playwright checks |
| #5 Mobile header, New Job, Ruby image | Implemented and deployed, integration tested; awaiting authenticated acceptance | Public mobile Playwright checks |
| #6 Fictional flooring isolation and seed | Implemented and deployed, integration tested; awaiting authenticated acceptance | Rollback-only tenant tests |
| #7 Flooring catalogue and pricing | Implemented and deployed, integration tested; awaiting authenticated acceptance | Connected catalogue and customer-price tests |
| #8 Flooring PO, receipt, reserve, pick, return | Implemented and deployed, integration tested; awaiting authenticated acceptance | Rollback-only workflow |
| #9 Flooring persisted actions | Implemented and deployed, integration tested; awaiting authenticated acceptance | Fictional tenant RPC integration |
| #10 Flooring public catalogue preview | Implemented and deployed, integration tested; awaiting authenticated acceptance | Public Chromium and privacy checks |
| #11 Flooring transactional reset | Implemented and deployed, integration tested; awaiting authenticated acceptance | Rollback reset tests |
| #12 Flooring quote, invoice and accounting | Partial | External accounting and authenticated end-to-end |
| #13 Master purchasing, sales, stock, logistics | Partial | FIFO cost-layer schema and valuation read path deployed at fbf43c80; automatic receipt/consumption allocation, corrections and full workflow incomplete |
| #14 Ruby document-confirmed actions | Partial | Invoice guidance only; confirmed execution and document matrix incomplete |
| #15 Worker Portal, timesheets, labour billing | Partial | Worker unit tests; role matrix, approvals and billing acceptance missing |
| #16 QuickBooks integration | Partial | Provider authorisation and synchronisation incomplete |
| #17 Xero, Money Overview, matching | Partial | Financial dashboard and Xero integration exist; transaction-level reconciliation unresolved |
| #18 Quote versioning, lead times, PDFs | Partial | Revision SQL tested; PDF and approval end-to-end incomplete |
| #19 Tenant isolation and financial safety | Partial | Rollback SQL exists; authenticated two-tenant role matrix incomplete |
| #20 Full responsive usability | Partial | Dashboard design deployed at e913e152; authenticated cross-device visual and interaction QA incomplete |

**Status distinction:** All ten fully implemented rows have production code deployed and complete integration-test evidence from prior checks. Their authenticated acceptance is still pending. Rows marked partial are not counted as complete even when individual components are deployed. No complete top-level requirement is currently in the 'implemented but deployment pending' category. Latest inventory test-only commit 7bc85699 passed CI but its own Vercel deployment was cancelled; the purchasing valuation UI at fbf43c80 is READY.

**Operational subrequirements, not additional denominator entries:** structured job-item first save, revision editing, history and audit are deployed; inventory FIFO layer/allocation schema and valuation endpoint are deployed but not integrated into automatic goods receipt and job consumption; dashboard cohesive styling deployed but not visually accepted; Ruby invoice due-date confirmation and execution not implemented. Job-page Quick Edit, uploads, notes, document relationships, payments and workforce labels remain partial. Keep these as child gates under the existing 20 requirements, not extra weighted points.

**Next measurement:** change an implemented or tested count only after full named scope has evidence; record the exact commit, migration, executed test and READY deployment. Do not alter genuine tenant records to obtain evidence.

## 27 October continuation after b411a42c (latest evidence)

**Fixed denominator unchanged: 20.** Full-scope implementation **10/20 (50%)**, full-scope integration testing **10/20 (50%)**, authenticated acceptance **0/20 (0%)**. No top-level requirement advanced, because stock reversals, financial provider reconciliation, automated review requests and remaining workflows are still incomplete.

- **FIFO accounting:** `ad721543` and applied migration `20261027211500` connect job consumption to atomic FIFO allocations. Two partial fictional-tenant goods receipts (3+2 units at £24), 4-unit job consumption (£96), remaining quantity 1, duplicate receipt/consumption rejection passed a rollback-only SQL test. Persistent test `tests/fifo-inventory-full-workflow-rollback.sql`. No fictional test records remained.
- **Verified historical openings:** applied migration `20261027214500` and commit `5d309b85`; requires documented evidence, approver, uncosted physical quantity and idempotency. Rollback-only fictional test passed. No opening valuation posted to genuine tenants.
- **Cost corrections:** applied migration `20261027220000` and commit `cc3c28a6`; only fully unused layers may be repriced with evidence, approval and immutable adjustment record. Fictional rollback test passed. Reversals of consumed layers remain open.
- **Inventory valuation defect:** `3ab926c2` replaced nonexistent `business_software_stock_balances` REST table with actual tenant-scoped stock movement aggregation; `00d1cd15` corrected zero-stock variance treatment. `029e7435` added inventory and payment regression cases to canonical CI; that run passed.
- **Payments:** read-only M&J ledger totals: £1,100 deposits + £1,625 final receipts + £9,600 historical unverified = £12,325; four historical entries undated; zero linked Xero records. Dashboard previously used summed job `amountPaid`, explaining why its source could diverge, but the precise £5,695 composition and £18,000-plus Xero figure are not yet transaction-reconciled. `c985eea2` added a tenant-scoped ledger endpoint, `205a3895` connected it to dashboard, and `8587ae5c` updated regression assertions. Genuine records unchanged.
- **Integrations:** `83ca821b` reorganised Xero header actions and removed redundant eyebrow; `4ad850a8` removed a hardcoded M&J-specific Would Use Again dashboard link and default job reference. Automated review requests, Microsoft 365 operational sending, QuickBooks OAuth, Ruby invoice execution and full integration reconciliation remain incomplete.
- **Dashboard:** `ce18f3fb` moved tenant-themed Sync Xero next to Money Overview heading and removed a redundant shortcut. Authenticated visual acceptance outstanding.

**Verification rule:** Vercel READY and CI success do not imply browser acceptance. Applied SQL functions are not proof of the entire stock reversal/correction workflow. The genuine payment ledger was read only; no automatic Xero linking was performed without transaction evidence.

## Continuation from bd90c49e: persistent unresolved acceptance issues

**Denominator remains 20.** Do not increase implementation above 10/20 (50%), integration-tested requirements above 10/20 (50%), or authenticated acceptance above 0/20 without full workflow evidence.

Delivered in this continuation: responsive three/two/one-column Integrations grid with full-width reconciliation workspace (8e2db722); Xero provider invoice-payment and bank-receipt transaction rows, IDs, dates and references (068d3e0f); expandable read-only Xero evidence interface and incomplete-pagination/overlap warning (e0806f33); redesigned default Recent Activity and consistent Money Overview headings (387dd894); universal Workforce tab and matching Open Quote/Open Invoice action styling (6971ef4b). These are partial implementation, not completed acceptance.

**Carry forward without dropping:** (1) full Xero transaction classification, verified external-link matches, loan/transfer exclusion and explicit approval for ambiguous receipts; two queued receipts do not represent provider history; (2) full Integrations design acceptance, real QuickBooks and Microsoft 365 connection verification and Would Use Again tenant-specific connection; (3) complete dashboard visual acceptance including financial tile hierarchy, job lists and mobile; (4) JOB-01 through JOB-12, including Quick Edit chevrons, customer/payment alignment, multi-item specs, uploads, notes and relationships; (5) tenant-managed workforce role category CRUD applied throughout shared workforce; (6) authorised review-request automation with triggers, delays, templates, opt-outs, delivery history and duplicate prevention, without imposing WhatsApp Business; (7) stock reversals, historical allocation corrections, Ruby confirmed due-date changes, workforce portal/timesheets/approvals, purchasing, sales, delivery and reporting. Do not edit genuine M&J operational or financial records without explicit approval. Use fictional tenants for tests.
