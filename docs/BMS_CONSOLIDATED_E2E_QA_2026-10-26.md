# Master BMS consolidated end-to-end QA for next session
Updated: 26 October 2026. Scope: shared BMS core, all tenants. Do not alter MJ010 or other historical financial records without approval.

## Test prerequisites
- Use an authenticated **non-financial test session** with owner, manager and restricted worker roles.
- Prefer an isolated staging tenant and a second synthetic tenant. Production currently has only one registered live tenant (mjmetal), so a real two-tenant interactive test is not yet possible there.
- No live supplier orders, customer invoices, bank payments, Xero allocations or QuickBooks authorisations should be sent without explicit approval.
- Compare desktop widths 1440px and 1024px, mobile 390px and 320px. Check sidebar, Ruby portrait, compact header, tenant branding, permissions and both New Job modes.

## One connected purchasing-to-delivery scenario
1. Create supplier and product with pack quantity, VAT, cost, selling price, stock-controlled flag and tenant-specific stock location.
2. Create a purchase order; retry the exact request key and verify the same order ID; retry changed payload with same key and expect rejection.
3. Receive part of an order and then the balance; check receipt key replay, different-quantity rejection, on-hand and stock audit.
4. Create a customer with an override price; create sales order; check server-resolved price and replay protection.
5. Reserve stock, retry, pick a subset, retry, deliver, assign fitter, record usage and accept unused returns. Verify on-hand, reserved and available quantities after each step.
6. Attempt cross-tenant supplier, customer, product, warehouse, subcontractor and sales-line references; all must be rejected.
7. Check catalogue publication and stock availability on the configured HTTPS website origin; ensure private customer-specific prices are never exposed publicly.

## Ruby and documents
- Upload genuine PDF, PNG, JPEG and WebP samples for supplier quotation, supplier invoice, receipt, delivery note, order confirmation and customer order.
- Confirm extraction of document reference, parties, dates, line quantities, VAT, totals and proposed workflow. Compare with the source; verify unclear fields are not invented.
- Verify document content cannot instruct Ruby to act without authorisation. Current document flow is **review-only**, not automated write-back.
- Test a separate confirmed Ruby action, permission denial and undo. Do not test financial actions on live records.

## Worker Portal and labour
- Assign worker, check role-specific visibility, schedule, clock in/out, progress updates and correction approval.
- Submit valid time; reject reversed, excessive, exact duplicate and partially overlapping intervals. Database exclusion constraint is installed, but interactive concurrency testing remains.
- Verify approved hours, labour rates, job costing, billing preview, permissions and PDF/CSV exports.

## Accounting and quotes
- Reconcile Xero receipts against unique job references, dates, amounts, existing payments and external transaction IDs; ensure Loan, capital and intercompany receipts go to review.
- MJ010: **read-only** investigate 17 subcontractor payments totalling £27,400, including 13 x £1,500 on 1 September and 2 x £1,900 on 14 September; verify £5,200 screenshot separately. Never correct automatically.
- Test Money Overview totals and sync refresh against underlying verified payment records.
- QuickBooks: verify company connection only after user authorises; the new read-only company check does not refresh tokens or synchronise invoices.
- Create quote with default lead time, edit to a new version, view older versions, generate and inspect customer PDF, verify branding, VAT, deposit and validity. Historical database currently has 40 quotes, 22 later-version rows, only 2 populated lead times and 1 saved PDF path; these figures do not establish PDF correctness.

## Industry demo and launch gates
- Flooring demo is currently a **browser-session simulation**, not a persisted second BMS tenant. Verify 48 m² with 10% wastage / 2.2 m² per pack = 24 packs; compare standard £39 vs customer £37, purchase/receipt/pick/return flow.
- Verify responsive UI visually, login/logout, sidebar groups and permissions, Ruby header and Quick Add/Full Job.
- Run GitHub BMS payment safety regression, canonical BMS build, release workflow, and production deployment READY check.
- Run disposable staging tenant-isolation SQL only in staging, never directly against production financial tables.
- Capture any failing step with tenant, role, job/order reference, expected/actual result and screenshot.

## Outstanding implementation, not certified complete
- End-to-end authenticated payment and UI verification; connected purchasing/warehouse/delivery lifecycle; Ruby confirmed document-to-BMS actions; full QuickBooks sync/token refresh; genuine persisted flooring demo; external website catalogue live integration; labour billing exports; quote PDF visual validation.
- All database migrations in this development run were additive or function guards; historical financial rows were not intentionally edited.

## Development continuation: 26 October late session
- Mobile header: retain logo, business name and Powered by Diamant Solutions; remove Ruby and the mobile Workspace collapse toggle. New Job and original Ruby portrait are in the drawer's scrollable region. Desktop compact navigation retained. Test at 320, 390, 768 and 1440 pixels, including long tenant names, opening/closing New Job, quick/full job routing and no overlap.
- **Flooring demo now has a separate persisted fictional tenant**, slug `flooring-showcase-demo`, with 4 priced products and coverage specifications, 2 fictional customers, a supplier, warehouse stock, a 48 m² job, a versioned quotation, a purchase order with partial goods receipt, a customer-priced sales order with partial reservation, delivery, fitting and an internal draft invoice. No real bank payments or external accounting connections were created.
- Rollback-only database integration tests were executed successfully both as database owner and with `SET LOCAL ROLE service_role`: remaining goods receipt, reservation, picking, return, sales order replay, customer price and area/pack validation. Two-tenant rollback-only isolation SQL also passed.
- Demo's existing interactive action buttons **remain a browser simulation**. A separate read-only connected snapshot now queries the real fictional tenant tables at `/api/bms-demo/flooring-data` and returned HTTP 200. **Do not present the demo as fully interactive or QuickBooks/Xero-connected yet**. The demo tenant has no configured real hostname or login membership.
- Service-role database privileges were found missing for several operations tables and restored for server-side use only. Verified authenticated/anonymous direct table writes remain denied. Test order creation, goods receipts, stock, customer prices and delivery creation through authenticated BMS UI tomorrow.
- Sales order m²/pack calculator now uses product coverage and wastage, and database rejects mismatched area/quantity. Test 48 m² + 10% wastage / 2.2 m² = 24 packs, and tile boxes at 1.44 m².
- Delivery and fitting planning now use stable request keys; verify same-request retry and changed-payload rejection. Inspect whether concurrent identical requests return a friendly replay result.
- **Demo launch gates:** provision a real dedicated hostname, assign authorised demo account access without sharing MJ Metal tenant privileges, and connect the flooring demo's interactive buttons to authenticated tenant-scoped APIs. Do not promise this is ready for the prospective customer until those gates and visual QA pass.
- **Financial approval gate:** MJ010 historical duplicate-looking entries and £5,200 screenshot remain untouched. No approval requested tonight.

## Additional verified operational fixes
- Found service-role permissions missing on stock, order lines, customer-specific prices and delivery tables. Restored server-only SELECT/INSERT/UPDATE permissions, leaving direct anonymous and authenticated writes denied. This resolved HTTP 503 on the fictional demo's connected API, now verified HTTP 200 with 4 products, stock balances, customer-specific sales price, PO receipt, SO reservation, quote, delivery and internal draft invoice.
- Added atomic delivery completion RPC that requires picked stock, creates delivered line quantities, advances sales order fulfilment, records delivery status/time and rejects changed replay keys. Executed rollback-only SQL successfully as `service_role`. Test via authenticated UI before treating as fully certified.
- Tested existing rollback-only two-tenant isolation SQL successfully.
- Financial records on MJ010 and other existing live tenants were not changed.

## Ruby and logistics follow-up gates
- New `POST /api/admin/ai/document-action` accepts only explicitly confirmed, attachment-owned, permission-checked draft purchase orders, draft sales orders or goods receipts, using stable request keys and existing tenant-checked RPCs. It does **not** send supplier orders, post invoices, reconcile payments or connect automatically to the Ruby chat UI yet.
- A delivery can now be marked delivered through the Operations UI after an explicit confirmation. The database only fulfils quantities already picked and rejects mismatched retries; integration SQL passed under `service_role`.
- Tomorrow: upload a fictional supplier quotation and customer order, review extracted fields, confirm draft creation through a controlled authenticated request, verify Ruby UI presentation, and check invoice/receipt/delivery-note review-only behaviour.

## Final read-only accounting and worker checks
- Xero bank receipt sync last checked 23:15 UTC on 26 October and reported success with zero transactions examined in that run. Earlier successful runs identified two Loan receipts needing review. **A successful zero-item sync does not prove customer payments reconcile.**
- Worker labour billing CSV now neutralises formula-like cell prefixes. Confirm Excel and Google Sheets open it safely and that legitimate numeric costs and negative adjustments remain interpretable.
- No authenticated live payment writes or historical financial corrections were performed.

## Service-role permission audit
- Audited all BMS tables for missing server-side read/insert privileges. Fixed missing Ruby attachment/usage, labour rate, worker location update and material allocation audit permissions. Unused legacy estimate/campaign/job-split tables were left restricted.
- Verified direct authenticated access to Ruby attachments remains denied. Confirm real Ruby file upload, OCR/AI review and document-action confirmation tomorrow.
- All changes apply to the shared BMS core. Only isolated fictional flooring tenant rows were seeded, and no existing tenant financial entries were edited.

## 27 October: demo chrome and flooring fixtures
- Demo selector and mode banner now reserve explicit sticky vertical space above the shared sidebar and header, including mobile drawer/backdrop. Confirm in a real browser at 320/390/768/1440 px, scroll, open Workspace, collapse on desktop, switch industry and ensure the sidebar is never obscured.
- Industry selector updated to restrained light controls. Shared CSS is used, not a tenant-specific sidebar implementation.
- Flooring demo generated jobs now use flooring product names, pack coverages, areas and job references instead of Northstar property scope. The featured FL001 no longer falsely shows an unverified £400 receipt as settled.
- **Still incomplete:** Public demo action buttons are session simulations, not persisted warehouse/accounting actions. Real connected data snapshot is read-only. Do not demonstrate it as fully live until a dedicated authenticated and safely resettable demo tenant workflow is implemented and tested.
- Acceptance testing should also confirm tenant isolation, no accidental writes to M&J, demo reset, quote version/PDF, worker labour, Ruby document confirmation, QuickBooks sandbox, Xero Money Overview and cross-tenant access denial.
