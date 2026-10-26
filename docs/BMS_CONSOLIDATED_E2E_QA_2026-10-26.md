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
