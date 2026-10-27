# Diamant Solutions master BMS acceptance checklist

Status is requirement-based, not based on commit counts or estimated percentages. Update each item only with evidence. **Implemented** does not mean authenticated end-to-end verified.

| Requirement | Status | Evidence / next gate |
|---|---|---|
| Shared tenant-aware design tokens | Implemented, automated regression | `app/bms-runtime/bms.css`, `BmsUI.tsx`, sidebar navigation test |
| Shared page, header, cards, forms, tables, modal, badge primitives | Implemented | `BmsUI.tsx`; migration of every existing page still open |
| All BMS pages migrated to central components | In progress, expanded coverage | Worker Portal, operations, labour costing, settings, integrations, users, price book and shared customer/job/quote/invoice/payments directory migrated to central primitives; Ruby uses tenant accent tokens. Remaining pages and authenticated visual QA open |
| Demo banner and industry selector clear sidebar | Code implemented, visual QA open | Verify desktop and mobile authenticated views |
| Mobile header, New Job, Ruby original image | Code implemented, visual QA open | Verify menu scroll and tenant logo at 320/390/768px |
| Flooring fictional tenant isolated data | Database integration verified | `supabase/demo/flooring_showcase_seed.sql`, rollback SQL |
| Flooring products, coverage and customer pricing | Database integration verified; connected UI implemented | `tests/flooring-showcase-connected.sql`; connected customer price lookup and area-to-pack estimate; authenticated visual QA pending |
| Flooring PO, goods receipt, reservation, picking, return | Database integration verified | Rollback SQL under service role |
| Flooring public demo interactive actions persisted | Implemented, authenticated E2E open | New manager-authorised `/api/bms-demo/flooring-actions` uses shared tenant-aware RPCs for sales, purchasing, goods receipts, reservations, picking, deliveries and returns; UI connected; production browser acceptance pending |
| Flooring connected website catalogue preview | Read-only implemented | `/api/bms-demo/flooring-data` |
| Flooring demo safe reset | Implemented and rollback-tested; authenticated E2E open | Guarded atomic database reset, explicit confirmation UI, seeded catalogue/customers/invoice restoration; rollback-only test passed |
| Flooring quotation, draft invoice, accounting | Atomic quote and internal draft workflows database-tested; authenticated E2E open | Server-derived quote/VAT invoice totals, idempotent quote and invoice RPCs; no external accounting provider for demo |
| Purchasing, sales, stock and logistics master core | Partially integrated | Authenticated UI and role acceptance pending |
| Ruby document interpretation and confirmed actions | Open for end-to-end verification | Test each document type, confirmation, permissions, idempotency |
| Worker Portal, scheduling, timesheets and labour billing | Open for end-to-end verification | Role matrix and invoice evidence pending |
| QuickBooks integration | Open for authorised integration verification | Credentials/consent required for live provider link |
| Xero, Money Overview and matching | Rate-limit defect mitigated in code; reconciliation acceptance open | Jobs GET no longer triggers repeated Xero sync; explicit POST sync button corrected; MJ010 historical anomalies untouched |
| Quote versions, lead times and PDF output | Atomic versioning implemented and database-tested; PDF/browser QA open | Shared idempotent quote revision RPC, version lock, cross-tenant rejection; visual PDF, exports and authenticated QA pending |
| Tenant isolation and financial safety | Partial database verification | Multi-tenant rollback SQL; authenticated role matrix pending |
| Full desktop/tablet/mobile usability | Open | Authenticated screenshot and interaction QA needed |

## Measured acceptance scorecard (fixed 20-requirement denominator)

See [BMS_REQUIREMENT_ACCEPTANCE_METRICS.md](BMS_REQUIREMENT_ACCEPTANCE_METRICS.md) for the per-requirement gate decisions and evidence.

| Evidence gate | At baseline `1501effb` | Current | Change |
|---|---:|---:|---:|
| Fully implemented scope | 9/20 (45%) | 10/20 (50%) | +1 requirement |
| Fully database/integration tested scope | 4/20 (20%) | 6/20 (30%) | +2 requirements |
| Authenticated browser end-to-end accepted | 0/20 (0%) | 0/20 (0%) | 0 |

**Method:** strict all-or-nothing gate per existing top-level requirement, no credit for partial implementation, no invented effort weighting. The ratios describe unweighted coverage, **not percentage of development effort complete**. The separate per-requirement ledger identifies outstanding work and blockers. No requirement is marked browser accepted.

## Latest authenticated-testing and flooring development evidence
- `1f741ea5` is READY on production, as are `2349b5ad` and the earlier shared design changes. This confirms successful Vercel builds only.
- `8a1e25e4`: fixed demo-host authorization mismatch: `runtimeTenant()` is absent on the public demo host, so previously the demo write API could not authorize a manager. The endpoint now verifies the Supabase auth token and checks an active owner/admin/manager membership in an active real tenant, but writes still target only the hardcoded fictional flooring tenant. **Authenticated HTTP/browser acceptance remains unverified.**
- `facdc6e0`: added same-origin rejection for cookie-authenticated demo writes.
- `6f7fd351`: deployed shared, idempotent delivery planning RPC with tenant-bound sales order and conflicting retry rejection. `d920f017`, `219b3dd9`, `40c2b136`: connected new sales order delivery planning to the fictional demo UI. `f77f2595`: rollback-only delivery retry and cross-tenant tests passed.
- `309d0056`, `f7d688f4`: Playwright test configuration and read-only public API, anonymous rejection, authenticated responsive smoke and opt-in fictional customer persistence/reset tests. `3f369a30`, `4b68a246`: protected manually triggered GitHub Actions workflow. **The Playwright suite has not yet executed**. It requires a dedicated, active manager test token in the protected environment; mutation tests additionally require an explicit workflow input. No secrets are stored in source or test artifacts.
- No authenticated browser session or dedicated test credentials were available in connected tools. Vercel named sandbox and session inventories were empty. Direct external HTTP calls from the container failed DNS resolution, and external URL retrieval could not access the BMS demo endpoint. Do not mark any authenticated acceptance passed.

## Non-negotiable safeguards
- All functionality and design code belongs in the shared BMS core; tenant branding and fictional seed data may differ.
- Never change historical MJ010 or any other live financial entries without explicit approval.
- Do not equate a successful CI build, READY deployment or rollback-only SQL with complete user-facing acceptance.

## 27 October 2026 continuation evidence
- `c1345a37`: removed unconditional success notice overriding rejected simulated stock actions; deployment subsequently confirmed READY.
- `43b890e7`: added connected flooring snapshot refresh, shared loading/error UI primitives, shared cards and a simulation disclosure. GitHub commit recorded; production verification pending.
- `5fc05628`: clarified connected invoice versus simulated stock counters and browser-only reset. GitHub commit recorded; production verification pending.
- No checklist item has advanced to authenticated end-to-end verification. No production financial records or tenant subscriptions were modified.

## 27 October 2026 functional continuation
- `e77b4a62`: new manager-authorised isolated demo action endpoint, reusing existing tenant-scoped stock, purchase, sales and delivery RPCs. No live tenant IDs accepted.
- `838bb614`: connected read endpoint now returns location, job, purchase-line, sales-line and delivery identifiers for authorised actions.
- `90eb2ab5` and `eeaa7692`: connected operations UI for customers, quotation revisions, flooring m²/pack calculations, sales orders, purchasing, goods receipt, reservations, picking, delivery and draft invoice; obsolete browser simulator removed.
- `e5f457d8`: customer retry handling and return guard. Existing rollback-only flooring integration test rerun successfully; anon and authenticated cannot directly execute the stock/sales/delivery RPCs, while service_role can.
- Build pipelines skip TypeScript validation, so successful Vercel compilation is not a type-check or authenticated browser acceptance. Reset, full workflow acceptance and all-page design migration remain open.

- `a8559608`: applied shared, tenant-accent-aware legacy-page compatibility styling for inputs, tables and focus without tenant-specific overrides. Visual QA remains open.
- Cross-tenant purchase-line receipt rejection tested with service_role inside an explicit rolled-back transaction; passed without financial or stock changes.

- `83e381af` and `7b350306`: connected customer-specific price records and displayed selected-customer pricing with flooring pack/m² calculations.
- `0ab7d08a`: added repeatable rollback-only cross-tenant receipt and website catalogue test; executed successfully against Supabase. No live records changed.

- `f1d0e56a`: demo-only return endpoint now checks cumulative previously returned stock against picked quantity; concurrency and authenticated browser testing still required.

## 27 October 2026 continuation: verified reset and enquiry pipeline
- Vercel production deployments `f1d0e56a` and `1501effb` confirmed READY.
- `171059db`: repaired a missing catalogue binding in the user-facing demo component and removed stale simulation error.
- `a0ee0413`: authenticated BMS managers can operate the **hardcoded fictional demo only**; no demo user membership exists, and no client tenant ID is accepted. Browser E2E still open.
- `d30dc314`: applied `flooring_showcase_transactional_reset` migration to Supabase. Guarded RPC rejects wrong confirmation and refuses reset if financial payments or connected external integrations exist. Restores seed data atomically without touching any live tenant.
- `790db9c6` and `2d89b72d`: reset API and explicit confirmation UI implemented.
- `d930bc09`: rollback-only reset acceptance test passed, including catalogue, customer, invoice restoration and unchanged live-tenant job count.
- `d2c73cab`: warehouse UI selects exact purchase/sales lines, quantities and delivery rather than always using the first record.
- `57874dd5`: applied shared `bms_create_enquiry_once` migration with tenant/customer validation, advisory lock and idempotent request key; rollback-only duplicate-prevention test passed.
- `b3e47d87` and `aa17ebbf`: connected customer enquiry API and UI. Enquiry-to-quote-to-invoice authenticated browser acceptance still outstanding.
- **Do not mark complete:** authenticated browser E2E, actual API persistence verification, full-page design migration, other industries, Ruby, Worker Portal and accounting integrations remain open.

- `81c87b2c`: complete rollback-only database workflow passed: 48 m²/10%/2.2 m² = 24 packs, customer-specific £37/pack, new enquiry, quote, sales order, purchase order, two partial receipts, reservation, picking, confirmed delivery and draft invoice. Live tenant job count unchanged. This is **database integration**, not authenticated browser E2E.
- Reset, seed and enquiry RPCs verified inaccessible to anon/authenticated roles and executable only by service_role.
- `df8f20cc`: server rejects sales order when customer differs from selected job's customer; `ebeb7724`: UI selects newly created customer/enquiry and clears stale choices after reset.

- `bef5a56d`: catalogue product cards now create persisted customer enquiries; `8dffe592`: area and wastage limits validated on server before sales order RPC.
- `d6484966`: rollback-only cross-tenant enquiry rejection test passed.
- Full browser acceptance remains open, despite successful database workflow and deployment builds.

## 27 October 2026 extended implementation and evidence
- `d6b757e6`: corrected a render-blocking JavaScript temporal-dead-zone reference in the Flooring Demo, where `connected` was used before `useState` initialized it. Vercel READY verified. Authenticated browser render remains untested.
- Shared design migration: `6c703037` Worker Portal, `6abd7cd8` sales/purchasing/warehouse/logistics, `e5153991` labour costing and billing, `d1ba6015` settings, `f7a9087b` integrations, `f6c66e4b` shared customer/job/quote/invoice/payment directory, `43b0e150` price book, `668f237e` users/permissions. Ruby tenant token migration `41867f04`. Shared CSS accent/focus/mobile/header refinements `b90b63ee`. These are **code migrations, not browser-verified completions**.
- `050cd9a7` shows persisted customer enquiries, quotation revisions, sales orders and draft invoices from the database rather than browser-only counters. `69fce044` adds job-linked snapshot fields; schema columns verified.
- `5264987b`: applied shared atomic quote revision migration. Advisory-lock version allocation, tenant validation, request-key uniqueness and conflicting retry rejection. `3eb3942b`: rollback-only version, duplicate and cross-tenant tests passed. `14c836b6` wired demo quote action to the shared RPC. RPC is service-role-only.
- `3d7d9ddd`: reran the full fictional enquiry → quotation → sales order → purchase → partial receipts → reservation → pick → delivery → draft invoice database integration workflow successfully under rollback. Transactional reset regression rerun successfully.
- `dae1e89a`: applied shared security migration pinning search paths for 16 tenant validation and worker-costing trigger functions. Supabase security advisor's `function_search_path_mutable` warnings reduced from 16 to zero; the full flooring workflow still passed.
- `bf039c13`: client retries use the same request key for identical actions after ambiguous network failures. `5dcfbd90`: accessible error/success feedback and correct Oak & Stone Flooring Demo name.
- Supabase advisor still reports pre-existing security warnings for 34 authenticated-callable SECURITY DEFINER functions, public extension and leaked-password protection. Review individual authorisation semantics before revoking or changing functions; no broad access changes made.
- **Authenticated browser end-to-end and mobile acceptance have NOT run:** no authenticated interactive browser session is available in the connected development tools. Production READY is not proof of user-facing persistence or mobile usability.

- `70d82b89`: removed hardcoded orange fallback from shared navigation; configured tenant colour continues to drive accent and contrast.
- `4cd2995f`, `0e136ad3`, `d27e6c3a`: preserved full-width responsive administration content inside migrated settings, integrations and users pages.
- `44c130d9`, `628c8cc8`: demo quotation revisions now accept editable, server-validated lead times.
- `4001de6e`: applied retry-terms guard to shared quote RPC; `610dc1bd` rollback test verifies conflicting lead times are rejected.
- Repeated rollback-only reset, complete order-to-invoice, quote revision and cross-tenant enquiry tests after migrations: all passed. No MJ010 or other live financial data changed.

- `30503790`: applied shared tenant-scoped internal draft invoice RPC migration. Invoice gross is derived from a persisted quotation and VAT, not client form totals; unique request keys prevent duplicate drafts. Existing live invoices unchanged.
- `4cb2049b`, `69e70162`: fictional demo invoice button now uses the latest saved quote and a deterministic quote-specific request key. `fdbe9856` rollback tests passed for £888 net + 20% VAT = £1,065.60, retry deduplication and cross-tenant rejection. RPC is service-role-only.
- `ef13f9ff`: full fictional enquiry-to-invoice rollback test now exercises both atomic quotation and invoice RPCs; passed. Transactional reset test also passed after invoice migration.

- Production Vercel runtime error clusters showed repeated Xero 429 throttling and 504/authorisation errors, including hundreds of invoice-refresh errors and over 1,000 bank-sync errors during 26 October. `cf63095b`: removed automatic Xero provider calls from the read-only jobs GET route; cached local financial snapshots remain, and explicit reconciliation remains available.
- `d519350c`: corrected integrations Xero sync button to issue POST, matching the permission-checked mutation endpoint. **Not yet authenticated browser-tested;** provider 429 recovery and financial matching still require controlled acceptance. No historical payment records changed.

- `76d93f1b`: explicit Xero invoice and bank sync now execute sequentially, reducing simultaneous OAuth token refresh and provider rate-limit pressure. Live Xero reconciliation acceptance remains open; no MJ010 financial data was edited.

## 27 October 2026 production-stability follow-up
- Vercel production deployment history (100 most recent at inspection) contained two historical ERROR builds: `56e5d3ce` DemoOperationsPanel JSX mismatched closing section; `404a6e2a` WorkerPortal JSX mismatched error-state section. Both errors were subsequently corrected and the later worker/demo changes built READY. `d6b757e6` and every later commit through `bb9b18bc` were covered by READY production deployments; production browser acceptance remains separate.
- Vercel production runtime logs for the latest 1-hour window reported no error-level entries. Historical grouped runtime errors from 26 October showed Xero bank sync authorization failures, 429/504 responses and repeated invoice refreshes. This is not proof that every route or Xero reconciliation is healthy.
- `c0d3cf12`: invoice reconciliation stops attempting additional invoice requests on 429 or authorization failures rather than repeatedly hammering Xero. Explicit sync remains permission-checked.
- `dd9e1eaa`, `b65eb950`: applied generic shared atomic customer creation and idempotency migrations; `c50375c2` switched Flooring Demo to the shared RPC. `19f58bde`: rollback tests passed for duplicate retry, conflicting payload rejection and tenant isolation.
- Authenticated browser tests were not performed because the available connected tools provide build/runtime inspection and SQL execution but no authenticated interactive browser. Do not promote browser acceptance statuses.

- Shared materials UI migration: `d91e2a12` purchasing workspace, `520aa893` receiving, `6223c09e` order copying, `d94ed947` history, `c25433ad` supplier offers. `5a6351ae` New Job menu fallback now uses the tenant accent token. All remain pending authenticated responsive acceptance.
- Post-migration rollback regression rerun: transactional flooring reset, full order-to-invoice, invoice idempotency and customer idempotency passed.

- `e6f18659`: shared BMS modal now supports Escape dismissal and initial keyboard focus; focus containment, restoration and authenticated browser QA remain open.
- Vercel alias inspection confirmed `bms.diamantsolutions.co.uk` and other configured domains were attached to a subsequent READY production deployment. This is deployment routing evidence only, not an authenticated page render or functional acceptance.

- `a5e0890d`: shared product autocomplete field with Escape-to-dismiss and expanded-state accessibility. `b8c4d20b` and `2349b5ad`: tenant-colour purchasing controls, mobile form sizes and touch targets. No authenticated mobile screenshot acceptance yet.
- Vercel build inspection: historical ERROR commits `56e5d3ce` and `404a6e2a` have later successful builds; latest production runtime error-level log query over 30 minutes returned none. This is **not** a complete browser or integration test.
