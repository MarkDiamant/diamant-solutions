# BMS granular functional readiness ledger

Authority: docs/BMS_MASTER_COMPLETION_CHECKLIST.md and docs/BMS_REQUIREMENT_ACCEPTANCE_METRICS.md. This ledger does not replace the strict 20-item gates.

## Measurement rules

Functional percentage for a requirement = verified working essential subfunctions / total explicitly enumerated essential subfunctions in the authoritative blueprint. Database/API integration percentage = subfunctions exercised with real persisted fixture data / subfunctions requiring integration. Automated testing coverage = required scenarios executed and passing / enumerated scenarios, reported with run IDs. UI readiness = all essential actions available and checked in a browser. Ready for user testing = deployed, safe isolated fixtures, successful smoke, and navigable interface. Final E2E = complete authenticated role/security/mobile acceptance. A source-code presence check alone is not a working functionality check.

**Important:** The existing checklist names top-level requirements but does not enumerate all of their essential subfunctions in a machine-countable way. Therefore unreviewed partial requirements have NO defensible numerical percentage yet. Reporting a numerical aggregate from guessed denominators would violate the user's instruction. The verified floor is 10/20 (50%) fully implemented strict gates, but this is NOT a claim that overall functional progress is exactly 50%. All 20 subfunction denominators must be reconciled to the original full blueprint before computing a granular overall percentage.

| # | Requirement | Verified implementation | Integration | Evidence / critical gap | User testing readiness | Final E2E |
|---:|---|---|---|---|---|---|
| 1 | Shared design tokens | 100% of strict implementation gate | Complete requirement integration gate passed | See authoritative checklist | Not yet established | No |
| 2 | Shared UI primitives | 100% of strict implementation gate | Complete requirement integration gate passed | See authoritative checklist | Not yet established | No |
| 3 | All-page shared UI migration | Not yet quantified against subcriteria | Partial or unverified | See authoritative checklist | Not yet established | No |
| 4 | Demo banner and industry selector | 100% of strict implementation gate | Complete requirement integration gate passed | See authoritative checklist | Not yet established | No |
| 5 | Mobile header, New Job and Ruby portrait | 100% of strict implementation gate | Complete requirement integration gate passed | See authoritative checklist | Not yet established | No |
| 6 | Fictional Flooring tenant isolation | 100% of strict implementation gate | Complete requirement integration gate passed | See authoritative checklist | Not yet established | No |
| 7 | Flooring catalogue, coverage and pricing | 100% of strict implementation gate | Complete requirement integration gate passed | See authoritative checklist | Not yet established | No |
| 8 | Flooring purchasing, stock and returns | 100% of strict implementation gate | Complete requirement integration gate passed | See authoritative checklist | Not yet established | No |
| 9 | Flooring persisted actions | 100% of strict implementation gate | Complete requirement integration gate passed | See authoritative checklist | Not yet established | No |
| 10 | Flooring public catalogue preview | 100% of strict implementation gate | Complete requirement integration gate passed | See authoritative checklist | Not yet established | No |
| 11 | Fictional reset | 100% of strict implementation gate | Complete requirement integration gate passed | See authoritative checklist | Not yet established | No |
| 12 | Flooring quotations, invoices and accounting | Not yet quantified against subcriteria | Partial or unverified | Printable internal invoice added; provider sync and Gmail delivery outstanding | Not yet: print view deployment verified, full lifecycle unverified | No |
| 13 | Master purchasing, sales, stock and logistics | Not yet quantified against subcriteria | Partial or unverified | See authoritative checklist | Not yet established | No |
| 14 | Ruby document-confirmed actions | Not yet quantified against subcriteria | Partial or unverified | See authoritative checklist | Not yet established | No |
| 15 | Worker Portal, timesheets and labour billing | Not yet quantified against subcriteria | Partial or unverified | Worker hour tests exist; role and billing acceptance outstanding | Not yet established | No |
| 16 | QuickBooks | Not yet quantified against subcriteria | Partial or unverified | See authoritative checklist | Not yet established | No |
| 17 | Xero, Money Overview and reconciliation | Not yet quantified against subcriteria | Partial or unverified | Sync throttling exists; live reconciliation unaccepted | Not yet established | No |
| 18 | Quotation versions, lead time and PDF | Not yet quantified against subcriteria | Partial or unverified | Versioning and print view partial; final PDF acceptance outstanding | Not yet established | No |
| 19 | Tenant isolation and financial safety | Not yet quantified against subcriteria | Partial or unverified | See authoritative checklist | Not yet established | No |
| 20 | Desktop, tablet and mobile usability | Not yet quantified against subcriteria | Partial or unverified | See authoritative checklist | Not yet established | No |

## Requirement 12 executable subfunction register

The existing acceptance evidence document records atomic quote revision, approval, VAT, draft invoice, issue, void, partial/final payments, idempotency, credit notes, cross-tenant rejection, balance constraint, invoice CSV, overdue aging, and finance UI. Database persistence was executed for the fictional tenant. A tenant-owned HTML invoice print view with Print / Save as PDF was added in commit 7171c855 and UI link in 3299f6a3. This is a browser print-to-PDF path, NOT a server-rendered PDF binary and NOT accepted external delivery. Remaining essentials: end-user print validation, connected Gmail send/draft, Xero/QuickBooks reconciliation, refunds where required, and authenticated role/mobile acceptance.

## No misleading readiness claims

The ten strictly implemented requirements are not automatically marked ready for hands-on user testing. Each needs a confirmed deployed page and safe end-user exercise. Current authenticated browser E2E acceptance is 0/20. The exact number of requirements ready for user testing is **0 verified**, not a claim that all 20 are unusable. Reconcile the remaining 20 subfunction inventories against the original blueprint and record evidence, then compute weighted-by-subfunction overall functional and integration percentages.
