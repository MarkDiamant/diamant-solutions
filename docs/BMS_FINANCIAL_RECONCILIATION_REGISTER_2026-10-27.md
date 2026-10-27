# BMS financial reconciliation and outstanding issues | 27 October 2026

## Verified production facts
- Production dashboard route: tenant hostname middleware rewrites /api/admin/jobs to /api/bms-live/jobs, whose payload uses public.bms_dashboard_payload_secure -> bms_dashboard_payload.
- The database function computes job amountPaid as the sum of business_software_payments.amount for that tenant, job and direction=customer_in. The dashboard sums amountPaid for non-placeholder jobs.
- M&J tenant 3ebc2265-8842-4826-b464-71783d6cf841: nine recorded incoming entries, £12,325.00. Five dated deposit/final payments £2,725; four undated historical_xero_paid entries £9,600. All nine lack verified external transaction links. Underlying dashboard payload currently returns £12,325.
- A different tenant has two invoice-payment entries totalling £144. Earlier cross-tenant £12,469 must NEVER be presented as the M&J total.
- Reported live dashboard £5,695 remains unreplicated against the current underlying payload; investigate browser version, deployed commit, authenticated tenant and timing before claiming resolved.
- User reports Xero received >£18,000. Not yet independently established for an identical date range or separated by customer receipts versus loans/transfers.
- M&J Xero bank-receipt sync runs on 27 October checked two transactions per run, imported zero, linked zero, queued two for review. The bank-receipt importer fetches only reconciled authorised GBP BankTransactions of type RECEIVE, so this is not an exhaustive accounting-wide receipt total. Invoice allocations and other Xero payment types require separate reconciliation.
- No existing M&J payment records have been edited or removed.

## Implemented commits
- 5e8123e: review loan and internal-transfer classifications before automatic bank receipt matching.
- 8cf87f2: source-qualify dashboard recorded payments and identify historical unverified entries.
- 08b4ebf, d0c633f, b40b606f: regression assertions for safeguards, date matching and dashboard labels.\n- f1b7f97: scheduled Xero sync requires exact matching payment dates; undated historical entries go to review.\n- cd09f60, 0b64aa9: purchasing draft quantity and unit-cost editing with regression coverage.

## Outstanding, ordered
1. Obtain Xero invoice Payments and relevant bank transaction totals by consistent date window, currency and classification; match unique external IDs and exclude loans/transfers and duplicates. Determine why user sees >£18k, and why the earlier UI showed £5,695. Do not silently rewrite historical £5,200.
2. Ensure scheduled bank sync and manual sync apply identical exclusion and review rules; support auditable matching with existing manual payments and cross-job protections.
3. Verify GitHub unit regressions, TypeScript build, Vercel READY and authenticated M&J UI before accepting fixes.
4. Purchasing: edit saved drafts, supplier product metadata, historical pricing, order and goods receipt, stock movement and valuation, reviewed imports.
5. Job pages: compact quick edit, consistent quote/invoice actions, multi-line dimensions/material/finish/quantity, notes and versioned documents, responsive files.
6. Workforce: assignments, scheduling, worker portal, time approvals, labour rates, fictional tenant acceptance.
7. Remaining master blueprint and tenant-isolation checks. Shared core only unless explicitly confirmed otherwise.

## Safeguards
Tenant-specific identifiers in this diagnostic document are evidence only. All application features must remain shared and tenant-isolated. Do not alter genuine M&J financial records without explicit user approval. Test writes with fictional tenant only.

## Continuation implementation
- e3c287b, 4929d6d, c6d9b97, 6fedc72: shared purchasing UI now prints saved supplier-order drafts and records confirmed physical goods receipts against an existing tenant-scoped, idempotent stock RPC. Workspace now loads tenant-specific stock locations. A failing regression test used an incorrect route-section boundary and was repaired. No actual goods receipt was submitted.
- 06dae9c, 9fb2ec4: new permission-gated, read-only Xero reconciliation audit endpoint at GET /api/admin/integrations/xero/reconciliation-audit. It fetches invoice payments and RECEIVE bank transactions separately, returns separate counts and totals with pagination-completeness warnings, and never adds the overlapping sources together or changes records. Authenticated live acceptance remains required.
- Production BMS dashboard SQL was rerun and returns M&J £12,325. Browser rendering of earlier £5,695 cannot be verified without an authenticated session; remains open.
- Saved-order **in-place** editing, supplier document uploads, stock valuation, full job costing, job-page redesign and workforce follow-up remain open. Existing duplicate-as-new-draft editing is available, but is not equivalent to modifying an existing saved order.
