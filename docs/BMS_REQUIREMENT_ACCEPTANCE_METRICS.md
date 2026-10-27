# BMS requirement acceptance metrics

Baseline: commit `1501effb`. Current evidence snapshot: commit `1f741ea5` plus later verified migrations. Scope: the **20 top-level requirements** already listed in `docs/BMS_MASTER_COMPLETION_CHECKLIST.md`. No new requirements silently added to the denominator.

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
| 4 | Demo banner and industry selector | Yes | No | Yes | No | No | Code only; visual QA pending |
| 5 | Mobile header/New Job/Ruby original image | Yes | No | Yes | No | No | Code only; mobile QA pending |
| 6 | Flooring fictional tenant isolation and seed | Yes | Yes | Yes | Yes | No | Seed and rollback tenant-isolation SQL |
| 7 | Flooring catalogue, coverage, customer prices | Yes | Yes | Yes | Yes | No | Connected flooring SQL and customer-specific price tests |
| 8 | Flooring PO/receipt/reserve/pick/return | Yes | Yes | Yes | Yes | No | Rollback-only warehouse and order workflow |
| 9 | Flooring interactive persisted actions | Yes | No | Yes | Yes | No | Post-baseline full workflow rollback test; no authenticated API |
| 10 | Flooring connected website catalogue preview | Yes | No | Yes | No | No | GET snapshot; no authenticated browser |
| 11 | Flooring guarded transactional reset | No | No | Yes | Yes | No | Post-baseline reset migration and rollback test |
| 12 | Flooring quotation, invoice and accounting | No | No | No | No | No | Internal drafts tested; accounting scope incomplete |
| 13 | Master purchasing, sales, stock and logistics | No | No | No | No | No | Partial integration, full scope incomplete |
| 14 | Ruby document-to-confirmed actions | No | No | No | No | No | Document/permission/idempotency acceptance missing |
| 15 | Worker Portal, timesheets, labour billing | No | No | No | No | No | Role matrix and billing acceptance missing |
| 16 | QuickBooks integration | No | No | No | No | No | Authorised provider acceptance missing |
| 17 | Xero, Money Overview and reconciliation | No | No | No | No | No | Rate-limit mitigation only; reconciliation not accepted |
| 18 | Quotation versioning, lead time and PDF | No | No | No | No | No | Atomic version tests; PDF scope unverified |
| 19 | Tenant isolation and financial safety | No | No | No | No | No | Partial rollback SQL, role matrix outstanding |
| 20 | Desktop/tablet/mobile usability | No | No | No | No | No | Authenticated responsive QA outstanding |

**Blockers:** No authenticated interactive browser session or verified test-user credentials available to the connected tools. Historical Vercel READY deployments prove successful compilation only; Next build skips type checking. Live provider integrations require authorised consent. No MJ010 financial changes authorised. The source checklist and individual tests remain the authority for details; update this ledger only when complete-gate evidence is added.
