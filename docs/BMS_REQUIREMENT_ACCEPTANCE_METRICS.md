# BMS requirement acceptance metrics

Baseline: commit `1501effb`. Current evidence snapshot: baseline `1f741ea5` plus verified subsequent source changes, SQL migrations and production HTTP checks through 27 October 2026. Scope: the **20 top-level requirements** already listed in `docs/BMS_MASTER_COMPLETION_CHECKLIST.md`. No new requirements silently added to the denominator.

**Counting rules:** Implemented = all named scope for a requirement is in source code (even when not user-accepted); database/integration tested = the *complete named requirement* has an executed repeatable automated test, not merely one sub-feature; authenticated E2E accepted = logged-in real browser actions and persisted results plus role/mobile gates where applicable. Partial work is recorded in notes but contributes **zero** to the completed stage. Each row counts once, regardless of effort. These are **unweighted requirement coverage ratios, not effort completed, product readiness or business value**. No estimated effort-weighted percentage is asserted.

| Gate | Baseline 1501effb | Current | Change |
|---|---:|---:|---:|
| Requirements in scope | 20 | 20 | 0 |
| Fully implemented | 9/20 (45.0%) | 10/20 (50.0%) | +1 requirements |
| Complete requirement database/integration tested | 4/20 (20.0%) | 6/20 (30.0%) | +2 requirements |
| Authenticated browser E2E accepted | 0/20 (0%) | 0/20 (0%) | 0 |

| # | Requirement | Baseline implemented | Baseline tested | Current implemented | Current tested | Browser accepted | Evidence / outstanding |
|---:|---|:---:|:---:|:---:|:---:|:---:|---|
| 1 | Shared tenant-aware design tokens | Yes | Yes | Yes | Yes | No | Shared CSS, BmsUI and navigation regression |
| 2 | Shared page/header/card/form/table/modal/badge primitives | Yes | No | Yes | No | No | BmsUI.tsx; complete consumer migration outstanding |
| 3 | Every BMS page migrated to central components | No | No | No | No | No | Outstanding pages and responsive QA |
| 4 | Demo banner and industry selector | Yes | No | Yes | No | No | Job Detail and modal header CSS migrated; authenticated visual QA pending |
| 5 | Mobile header/New Job/Ruby original image | Yes | No | Yes | No | No | Code only; mobile QA pending |
| 6 | Flooring fictional tenant isolation and seed | Yes | Yes | Yes | Yes | No | Seed and rollback tenant-isolation SQL |
| 7 | Flooring catalogue, coverage, customer prices | Yes | Yes | Yes | Yes | No | Connected flooring SQL and customer-specific price tests |
| 8 | Flooring PO/receipt/reserve/pick/return | Yes | Yes | Yes | Yes | No | Rollback-only warehouse and order workflow |
| 9 | Flooring interactive persisted actions | Yes | No | Yes | Yes | No | Post-baseline full workflow rollback test; no authenticated API |
| 10 | Flooring connected website catalogue preview | Yes | No | Yes | No | No | Live HTTP 200 privacy-filtered catalogue JSON (4 items), UI preview still not browser accepted |
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
