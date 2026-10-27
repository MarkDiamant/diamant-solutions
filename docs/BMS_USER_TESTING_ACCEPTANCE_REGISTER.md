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
