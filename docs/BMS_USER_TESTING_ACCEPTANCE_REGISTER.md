# BMS user-reported acceptance register

Updated 27 October 2026. All rows are **Awaiting user testing**, not user-confirmed resolved, unless explicitly noted. GitHub commits, successful CI and READY Vercel deployments are engineering evidence, not customer acceptance. Applies to shared master BMS; no tenant-specific code exception approved.

| Area | Engineering evidence | Acceptance status / remaining verification |
|---|---|---|
| MJ048 job items permissions | be5d7a2d Supabase migration applied, service_role grants checked; empty-state and append workflow e105eb9f, ea3c3f54 | Awaiting user testing; authenticated MJ048 browser workflow not executed |
| Job navigation, split options, single Save | 258cb0b7, 7ce26049 | Awaiting user testing |
| Duplicate status / priority cards | e66f9ce3 | Awaiting user testing |
| Work Types search and selection retention | e8ff02c8, ce7ec7c9 | Awaiting user testing |
| Quick Edit, job notes and next action | fdbb6645 | Awaiting user testing; broader quote/invoice note separation remains |
| Tenant work types, workforce roles, materials, colours, finishes | 54ffbab1, 1058f65c, 7310f280 | Awaiting user testing; verify historical references and configured role labels |
| Manager names | 7310f280, 26d621fd | Awaiting user testing; tenant administrator must supply actual names |
| Tasks / Job Detail / Settings / directory loading | d9cf8a87, f76f85db, 1058f65c, f43edd31 | Awaiting user testing; more modules remain |
| Dashboard £12,325 and Xero reconciliation | Earlier fixes; unresolved £10,400 claim and incomplete Xero evidence | Awaiting user testing, financial investigation OPEN |
| Dashboard Recent Activity, Money Overview and actions | Earlier developer claims | Awaiting user testing |
| Integrations cards, Xero evidence and statuses | Earlier developer claims | Awaiting user testing; remaining integrations incomplete |
| Quote/Invoice actions, payment-aware email, job Invoice tab | Earlier developer claims | Awaiting user testing; due-date/Xero actions incomplete |
| Workforce heading, Tasks to MJ048 navigation | Earlier developer claims | Heading awaiting user testing; Tasks navigation **user-confirmed resolved** |
| FIFO receipts and job consumption | Earlier developer claims | Awaiting user testing; stock reversals and valuation still incomplete |

## Financial safeguards

Read-only evidence: MJ010 quoted £10,400; one unverified historical £5,200 customer receipt; 17 subcontractor-out entries totalling £27,400; two separate Meyer Scher / Brookside Works Ltd customer records, associated with MJ010 and MJ042. No verified £10,400 Xero receipt or authorised reconciliation correction. Do not alter production financial or operational records without explicit user approval.

## Requirement counting

Keep the existing 20-requirement denominator and previously audited stage counts unchanged until full-scope implementation and executed acceptance evidence justify updates. New sub-feature commits do not constitute completion of a top-level requirement.
