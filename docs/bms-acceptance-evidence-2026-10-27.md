# BMS acceptance evidence, 27 October 2026

This is an evidence inventory for the unfinished requirements, not a substitute for the authoritative 20-requirement blueprint. Do not change the headline acceptance figures without the original checklist and all required gates.

## Requirement #12, quotations, invoicing and accounting

| Acceptance criterion | Status | Evidence |
|---|---|---|
| Quotation revision creation | Database integration tested | Fictional Flooring revision 2 created and persisted |
| Configurable VAT and penny precision | Source regression tested | Shared finance helper and API validation |
| Latest quotation approval | Database integration tested | Approved fictional revision 2; atomic service-only RPC and audit |
| Duplicate approval prevention | Database integration tested | Repeat returns created=false; audit event only once |
| Draft invoice from approved quotation | Database integration tested | Fictional invoice £144.00 created from approved £120 net + VAT |
| Duplicate draft invoice prevention | Database integration tested | Existing invoice returned across request keys |
| Invoice issue | Database integration tested | Fictional invoice issued and repeat returned created=false |
| Invoice void | Database integration tested | Fictional unpaid invoice voided and repeat returned created=false |
| Partial customer payment | Database integration tested | £44.00 allocated; £100 outstanding |
| Final customer payment | Database integration tested | £100.00 allocated; £0 outstanding; invoice paid |
| Payment idempotency | Database integration tested | Repeat £44 payment returned original payment ID, no second allocation |
| Overpayment prevention | Negative database integration tested | Attempt on fully paid invoice rejected |
| Cross-tenant payment prevention | Negative database integration tested | Foreign tenant rejected |
| Paid invoice void prevention | Negative database integration tested | Attempt rejected |
| Tenant/job ownership of source quote and allocations | Database validated | Composite foreign keys validated |
| Finance review UI | Implemented; browser acceptance outstanding | Shared UI provides quote, issue, void, payment and overdue display |
| Authenticated browser E2E | Blocked by protected manager credentials | CI environment secrets not configured through connector |
| External accounting reconciliation | Outstanding | No external accounting write integration accepted for this workflow |
| Internal credit notes against outstanding invoices | Database integration tested | £75 and £125 fictional credits persisted, invoice settled; retry returned same note |\n| Credit-note overcredit and cross-tenant rejection | Negative database integration tested | Both rejected |\n| Internal invoice financial balance constraint | Database validated | Gross = paid + credited + due; inconsistent write rejected |\n| Refunds and external accounting credit synchronisation | Outstanding | Requires accounting-consistent refund and provider integration |

## Requirement #9, fictional Flooring acceptance

| Criterion | Status |
|---|---|
| Anonymous mutation denied | Source guarded; latest Playwright execution unverified |
| Anonymous finance ledger denied | Added Playwright assertion; execution unverified |
| Cross-origin cookie mutation denied | Source guarded; latest Playwright execution unverified |
| Public catalogue privacy | Playwright assertion present; execution unverified |
| Authenticated manager persistence and idempotency | Protected Playwright test present; credential gate outstanding |
| Authenticated finance ledger reconciliation | Protected Playwright assertion added; credential gate outstanding |

## Scoring discipline

Headline figures inherited from previous accepted checklist: 10/20 implemented, 10/20 integration-tested, 0/20 authenticated E2E accepted. These have not been advanced because the complete authoritative master checklist and full browser evidence have not been reconciled. The table above records independently verified individual gates without inventing completion percentages.
