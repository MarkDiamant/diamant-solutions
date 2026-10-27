# BMS user-reported acceptance register

Updated 27 October 2026. All rows are **Awaiting user testing**, not user-confirmed resolved, unless explicitly noted. GitHub commits, successful CI and READY Vercel deployments are engineering evidence, not customer acceptance. Applies to shared master BMS; no tenant-specific code exception approved.

| Area | Engineering evidence | Acceptance status / remaining verification |
|---|---|---|
| MJ048 job items permissions | be5d7a2d Supabase migration applied, service_role grants checked; empty-state and append workflow e105eb9f, ea3c3f54 | Awaiting user testing; authenticated MJ048 browser workflow not executed |
| Job navigation, dedicated Split Job/Order tab, header action removal, single Save | 258cb0b7, 7ce26049, 398fc7e8 | Awaiting user testing; verify every tab and responsive breakpoint |
| Duplicate status / priority cards | e66f9ce3 | Awaiting user testing |
| Work Types searchable multiselect, job-specific Add New, tenant Settings management | e8ff02c8, ce7ec7c9, e94aa4ed | Awaiting user testing; verify selections survive filtering, save and reload |
| Quick Edit, job notes, due date and advanced Job Options | fdbb6645, f680b89b | Awaiting user testing; quote/invoice note separation remains |
| Tenant work types, workforce roles, materials, colours, finishes | 54ffbab1, 1058f65c, 7310f280 | Awaiting user testing; verify historical references and configured role labels |
| Manager names | 7310f280, 26d621fd | Awaiting user testing; tenant administrator must supply actual names |
| Tasks / Job Detail / Settings / directory loading | d9cf8a87, f76f85db, 1058f65c, f43edd31 | Awaiting user testing; more modules remain |
| Dashboard £12,325 and Xero reconciliation | Earlier fixes; 9c565e72 flags undated historical payments on job page; unresolved £10,400 claim and incomplete Xero evidence | Awaiting user testing, financial investigation OPEN |
| Dashboard Recent Activity, Money Overview and actions | Earlier developer claims | Awaiting user testing |
| Integrations cards, Xero evidence and statuses | Earlier developer claims | Awaiting user testing; remaining integrations incomplete |
| Quote/Invoice actions, payment-aware email, job Invoice tab | Earlier developer claims | Awaiting user testing; due-date/Xero actions incomplete |
| Workforce heading, Tasks to MJ048 navigation | Earlier developer claims | Heading awaiting user testing; Tasks navigation **user-confirmed resolved** |
| FIFO receipts and job consumption | Earlier developer claims | Awaiting user testing; stock reversals and valuation still incomplete |

## Financial safeguards

Read-only evidence: MJ010 quoted £10,400; one unverified historical £5,200 customer receipt; 17 subcontractor-out entries totalling £27,400; two separate Meyer Scher / Brookside Works Ltd customer records, associated with MJ010 and MJ042. Read-only SQL confirms MJ010 £5,200 historical_xero_paid has paid_at NULL, screenshot-only notes and no external transaction link. Across this tenant, all 9 customer-in entries total £12,325 (£9,600 historical, £1,100 deposits, £1,625 final); external payment link table contains 0 links. MJ010 has no linked invoice row in the local BMS invoices table. MJ048 has 0 structured job items, and service_role SELECT/INSERT privileges exist for items and revisions. No verified £10,400 Xero receipt or authorised reconciliation correction. Do not alter production financial or operational records without explicit user approval.

## Requirement counting

Keep the existing 20-requirement denominator and previously audited stage counts unchanged until full-scope implementation and executed acceptance evidence justify updates. New sub-feature commits do not constitute completion of a top-level requirement.

## Current implementation batch

398fc7e8, e94aa4ed, f680b89b, 9c565e72, 94f83999: split tab and header actions, searchable multiselect, Quick Edit and Job Options, historical-payment warning. GitHub CI and production build are engineering gates, not user acceptance. All remain open until the user personally confirms them. Authenticated MJ048 and live Xero transaction verification are still outstanding.

## Shared-core tenant rollout

Shared BMS package `1.0.2` was released from commit `07bb39bb`, superseding `1.0.1` after fixing a strict TypeScript Ruby invoice-context callback. The M&J tenant compatibility consumer was updated to pin immutable `1.0.2` in commits `6bf16cb1` and `302925ea`, following compatibility field alignment `e0285f6b`. **M&J Vercel deployment `302925ea` is READY.** Initial intermediate builds failed but were superseded by this successful build. The shared master Vercel deployment for `7dc5c668` is READY; the final `1.0.2` package version and job-page changes are in canonical GitHub. No live business data was changed and no user acceptance inferred.

## Follow-up engineering audit from eaa76034

- `8ca2c8a5`: job-item revision cancellation now restores the original snapshot; successful append, first save and revision reload server-authoritative items; stable item IDs used for React keys. Regression added in `ff5cdc5f`. **Authenticated user/browser acceptance remains OPEN**, including MJ048.
- `5647bea5`: Xero bank receipt discovery no longer invokes the financial-ledger posting RPC. Every proposed match, including same job/amount/date, goes to a tenant-scoped review queue. Discovery increased to 100 pages and reports Xero 429 Retry-After as partial failure. Regression added in `38d979be`. Human approval workflow to post reviewed entries, direct Xero transaction-level verification and authenticated role QA remain OPEN.
- Read-only production SQL: MJ010 has 13 entries of £1,500 sharing 1 September 2026 timestamp and two £1,900 entries sharing 14 September 2026 timestamp; there are also £1,500 and £2,600 separate-date entries, 17 subcontractor entries in all. Potential duplicates are not proven. Two unmatched Xero bank receipts total £58.62 (the previously classified loans). No verified N18 £10,400 receipt. No real payment, cost, invoice or job was altered.
- **Completion scorecard unchanged:** fully implemented 10/20 = 50%, fully integration-tested 10/20 = 50%, authenticated browser accepted 0/20 = 0%. These are unweighted requirement gates; incremental source changes do not count as full requirement completion. Provisional feature-level progress is not asserted without an audited denominator.

## Additional verification batch after 45ddb354

- `efd07f08`: Quick Edit cancel discards unsaved title, manager, action, due date and notes; closed editor resynchronises from refreshed job data. Regression `9922eadd` passed in GitHub CI. Production `efd07f08` READY. **User acceptance open.**
- `029e7585`: critical Xero bank-receipt loan classifier used double-escaped regular-expression boundaries and whitespace, causing incorrect loan/transfer classification. Fixed to actual regex escapes. `6ca17f0f` runs classifier against loan, director loan, internal transfer, capital introduced, owner contribution and ordinary customer deposit. GitHub regression suite passed. Production readiness to be checked separately. **Financial acceptance open.**
- Full job page, MJ048 authenticated item empty state and revisions, notes/files/payment history, Xero N18 transaction verification and mobile role testing remain open. No real operational/financial data was changed.
- Audited requirement scorecard remains implemented 10/20 (50%), complete automated integration tested 10/20 (50%), authenticated accepted 0/20 (0%). Provisional coverage not raised absent an auditable full-requirement gate.

## Continuation after d5c4a22d

- Verified Vercel deployment for Xero loan classifier `029e7585` is **READY** (`dpl_BQw1Ta62rdtC3wQF8nVkc44XMXbo`). Previous regression suite `6ca17f0f` passed.
- `5f009de8`: Activity tab retains form entries if the save fails, rather than resetting or silently losing them. `2560da95` adds regression evidence. **Awaiting user acceptance**.
- `c623922e`: Job Items invalidates cached revision history after append, initial save or revision; suppresses history action during read errors. `23ed58df` adds regression evidence. **Awaiting user acceptance**.
- Authenticated desktop/mobile browser verification has NOT been performed; no browser session with authorised credentials is available in this tool run. Do not count source assertions or CI as this verification. MJ048 and all other unconfirmed findings remain OPEN.
- Audited score: 10/20 fully implemented = 50%; 10/20 fully integration-tested = 50%; 0/20 authenticated accepted = 0%. Provisional: unchanged at 50%, 50%, 0% pending end-to-end evidence; no complete requirement newly closed. Tasks-to-MJ048 navigation remains the sole user-confirmed resolution outside the aggregate 20-gate count.
