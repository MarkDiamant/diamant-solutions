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

## Master BMS continuation and shared-core 1.0.3 rollout

- Job Activity: `5f009de8` keeps unsent form entries after server failure. Job Items: `c623922e` invalidates stale revision history after successful changes and hides actions on load failure. Both earlier master deployments READY; user acceptance OPEN.
- Job Detail: `e4da1376` preserves historical manager assignments when manager options change, distinguishes internal Job Notes from quotation requirements and Quote Notes, and states invoice-specific notes must be handled on the invoice. **This is label/selection safety, not a complete invoice-notes persistence feature.** `b665f45e` prevents empty Work Type selection from silently reverting. `20083324` preserves the core job when full-detail loading fails and offers retry. `22eb16f5` provides mobile Save Job dock clearance and truncates lengthy work type labels. **All user acceptance OPEN**; mobile authenticated testing not performed.
- Shared core `1.0.3` released at `c173cfa9`, immutable asset `markdiamant-business-software-core-1.0.3.tgz`; release, package and regression CI SUCCESS. Master deployment `c173cfa9` READY. M&J tenant integration pinned in `MarkDiamant/mjmetal` `3edca41b` and deployment READY, with no tenant-specific functional code and no operational data changes.
- Xero bank sync `da4800f5`: bounded 429 retry with Retry-After <=5 seconds, otherwise stops with a recorded partial sync; `a58523d7` regression suite SUCCESS. Review-only matching still never creates customer ledger entries. Production READY of this newer route must be verified separately.
- Read-only Supabase audit: Xero and Google integrations are recorded connected. Latest bank receipt sync observed at 19:45 UTC 27 Oct, `checked=2`, `needs_review=2`, `imported=0`, `matched_existing=0`, `failed=0`. The unmatched queue still contains two `needs_review` entries totalling £58.62. This does not verify N18 £10,400 or the claimed >£18,000 Xero total. No real financial records were modified.
- Authenticated browser/mobile role tests and MJ048 save/revision end-to-end still not executed. No acceptance status changed; Tasks-to-MJ048 remains sole confirmed exception. Audited 20-requirement scorecard stays 10/20 implemented (50%), 10/20 integration-tested (50%), 0/20 authenticated accepted (0%). Provisional percentages remain 50%, 50%, 0% pending complete-gate evidence.

## Final continuation: shared core v1.0.5

- `844850bc` / `11234a4b`: Activity form disables duplicate submissions while pending, shows saving state, and always restores the button on success or failure. The first v1.0.4 iteration omitted the finally reset; the regression exposed this and v1.0.5 fixes it. **Awaiting user acceptance.**
- `a7772c94`: shared BMS core v1.0.5 immutable GitHub release, release and package CI SUCCESS. Master Vercel `a7772c94` READY. Tenant dependency pinned in `MarkDiamant/mjmetal` `ef4fbb3c` and tenant Vercel `ef4fbb3c` READY. No tenant-specific functional code.
- Xero 429 bounded retry `da4800f5` master Vercel READY. No direct Xero customer-payment posting. Production bank receipt sync latest read-only evidence checked only 2 transactions, both in review, no imported or matched payments; this is insufficient to establish the N18 £10,400 receipt or >£18,000 total.
- `6719d64c` updates the regression assertion for the exact finally-reset syntax. Full GitHub regression suite `6719d64c` completed SUCCESS. Authenticated browser/mobile and MJ048 real job-item save/cancel not performed, remain OPEN. No user acceptance status changed.
- Audited 20-requirement gates unchanged: implemented 10/20=50%, integration-tested 10/20=50%, authenticated accepted 0/20=0%. Provisional unchanged at 50%,50%,0% pending end-to-end evidence. Tasks-to-MJ048 navigation remains user-confirmed.

## 27 October continuation: invoice notes and reconciliation snapshot

- `e3e730db`: added nullable `invoice_notes` to shared invoice table, migrated production schema without altering any existing invoice values. `2f193af6` adds tenant-scoped, permission-checked, confirmation-required invoice notes persistence for BMS-origin invoices only; Xero-origin wording changes rejected. `01e77ea6` records previous and new wording in tenant audit events, reporting partial-save failures. `da16d3e4` / `df1f1f2e` add invoice notes editor, cancellation and PDF display with canonical runtime fallback. Shared core v1.0.7 released at `ba08b183`. **Unverified tenant route compatibility means do not claim M&J invoice-notes end-to-end READY or user acceptance.**
- `6194ef93` adds tenant-scoped read-only `operations/invoice-reconciliation` snapshot, separates invoice paid amounts from BMS customer ledger to prevent false double-counting, excludes voided/deleted invoices, highlights undated historical entries and exposes incomplete pagination. It is **not direct Xero transaction-level matching**. Tests `650f0fc5` added.
- Read-only production findings: five Xero-snapshot invoices total £13,270, including one voided invoice of £5,040. Active invoices total £8,230, amount paid £2,970, amount due £5,260. Historical MJ010 £5,200 still has null paid_at and only screenshot evidence; no N18 reference in tenant job lookup. This cannot reconcile the claimed >£18,000 Xero figure or £10,400 N18 receipt. No customer payments or subcontractor entries changed.
- Browser/mobile authentication and end-to-end tenant route validation remain OPEN. Do not mark any requirement user-accepted; previously confirmed Tasks-to-MJ048 navigation exception remains. Audited top-level scorecard unchanged: 10/20 implementation 50%, 10/20 integration testing 50%, 0/20 authenticated acceptance 0%. Provisional same pending full gates.

- `8a9201ba` / `b116e414`: invoice notes cannot be edited once a BMS invoice is issued, sent or paid; draft/submitted only, formal amendment required for issued records. `451c83cf` regression added; shared-core v1.0.8 at `d4e9d659` release requested. User acceptance OPEN. M&J remains pinned to v1.0.5 until a compatible tenant-neutral invoice notes route can be deployed and tested; do not present the master-only endpoint as working on M&J.

- `1c8ea6a7`: invoice due-date edit now retries canonical BMS route when legacy `/api/admin/invoices/change-due-date` returns 404, retaining explicit confirmation and Xero amount/payment safeguards. `3f2d8518` regression. Shared core v1.0.9 release requested `c9f190de`; deployment and CI must be verified. User acceptance OPEN, and tenant compatibility remains blocked on tenant-neutral routing.

## Shared-core rollout and Xero pagination continuation

- Shared package `bms-core-v1.0.9` package/release/regression SUCCESS, master deployment `c9f190de` READY. Tenant `MarkDiamant/mjmetal` pinned to immutable v1.0.9 via `c2f3fe6f` and `9a5693b9`, M&J Vercel `9a5693b9` READY. This establishes deployment only, NOT authenticated invoice workflow verification.
- Invoice Notes and due-date editing remain **OPEN for M&J**: legacy tenant `/api/admin/invoices/*` routes do not include the new operations, and `/api/bms-live/*` master runtime does not exist in the tenant app. Do not claim these are working or accepted until a tenant-neutral authenticated adapter and actual end-to-end verification exist. Existing job, tasks, settings, integrations and inventory acceptance issues remain open; Tasks-to-MJ048 navigation is still the sole previously confirmed fix.
- `4ee2ea27`: read-only Xero reconciliation audit now traverses up to 100 pages per source rather than 5 and returns separate invoice-payment and bank-receipt completeness indicators. `fb1f8f7e` regression added. This does NOT establish that Xero transactions were fetched or N18 reconciled, and no real financial entries changed.
- Authenticated browser/mobile access is unavailable through the current connected toolset. User acceptance remains 0/20. Audited/provisional requirement gates remain implementation 10/20 (50%), integration testing 10/20 (50%), authenticated acceptance 0/20 (0%).

## Continued master development, invoice atomicity and Xero evidence

- `00128e1c` applied production schema migration for `bms_update_invoice_notes_atomic`, tenant-locked, service-role-only, invoice draft/submitted only. A single database transaction now updates notes and inserts full before/after audit, rolling back both on error. `bb53b7f1` switched the master invoice notes endpoint to this RPC. `4756fcac` GitHub regression SUCCESS. Function privileges verified: authenticated EXECUTE false, service_role true. No real invoice values changed by migration. Invoice Notes M&J legacy route compatibility still **OPEN**.
- `fe450af6` / `4d646742`: read-only Xero reconciliation audit now separately flags possible loans/internal transfers versus unclassified customer-receipt candidates, preserving original evidence and avoiding ledger writes. `d14f43e4` behavioral regression SUCCESS. Classification is indicative only, not proof of source.
- `5ed58a36` / `a46aff18`: tenant-scoped Xero external transaction ID and amount cross-check against BMS customer ledger and verified external links. Unlinked invoice payments, missing IDs and amount discrepancies are disclosed, not posted. `c20139b2`: bounded Xero GET Retry-After and explicit 429 incomplete audit error. `97b2243e`: Xero invoice reference investigation works even when BMS job reference is absent (N18). `8476581c` regression SUCCESS. Initial master builds failed on TypeScript Map tuple inference; `a46aff18` corrected it and master Vercel **READY**, GitHub regression and payment-safety checks SUCCESS.
- Read-only production verification: customer ledger still **9 entries, £12,325**, verified Xero external links **zero**, no BMS job reference containing **N18**. MJ010 subcontractor records include **13 × £1,500** on 1 Sep and **2 × £1,900** on 14 Sep with repeated exact timestamps. These are suspicious, not confirmed duplicates. N18 £10,400 and MJ010 £5,200 still unverified. No financial records changed.
- No authenticated browser/mobile role session or direct authenticated Xero API access available in this tool session. M&J remains on shared core v1.0.9 READY but invoice-specific routing unresolved. No newly user-accepted fixes; preserve Tasks-to-MJ048 confirmed navigation. Audited 20-gate scores remain 10/20 implementation (50%), 10/20 integration-tested (50%), 0/20 authenticated acceptance (0%). Provisional same pending evidence.

## Job Detail page-only development continuation (shared core v1.0.12)

- `55ac977d`: Job Items material, finish and colour inputs now suggest tenant-configured Settings values on append and revision, while retaining custom/historical values. Successful append/revision/save notices survive authoritative reload. `3249c938`: initial unsaved items can be explicitly discarded, revision controls and history requests lock during saves, and append cancellation clears draft.
- `d56144ec`: Job Detail exposes tenant-settings loading failure instead of silently using defaults and clears pending-tab transitions in `finally`. `eefbc927`: searchable Work Types multiselect synchronizes authoritative values only before local edits, preserving unsaved selections.
- `f83f261b`: Workforce assignment roles are tenant-configurable and preserve historical assignment values rather than using a fixed list. `5ae25724`: workforce assignment/payment actions report failures, lock pending requests and require explicit payment confirmation; no real payment action was executed.
- `fc1b48d0`: Job Files upload/delete now checks HTTP results, reports errors, unlocks in `finally`, encodes job references and uses safe external link attributes.
- Regression additions `05bc36fa`, `369cdb17`, `36715818`; shared-core package 1.0.12 `4f66c098` release/package/regression SUCCESS and master Vercel READY. Tenant package upgrade `72a13035` Vercel READY, shared core v1.0.12 installed in M&J. This verifies delivery, not authenticated workflows.
- All above are **developer-claimed, awaiting user acceptance**. Still OPEN: authenticated desktop/mobile job page, MJ048 append/revision/save/history against actual authorised session (no genuine data mutation permitted for tests), complete Quote/Invoice actions and notes boundary E2E, file/workforce actual uploads/edits, tab-specific permissions and end-to-end Save/Cancel. Preserve existing confirmed Tasks-to-MJ048 navigation and all cross-page issues.
- No requirement fully closed: 10/20 implementation (50%), 10/20 integration-tested (50%), 0/20 authenticated accepted (0%). Source regressions and READY deployments are not a substitute for authenticated end-to-end workflows.

## User Job Detail test results and coordinated Activity/layout repair (27 October 2026)

**Explicitly user-confirmed working, not blanket Job Detail acceptance:** Split Job/Order dedicated tab; Work Types searchable/selectable; assigned manager displayed as MD (editing NOT confirmed); Tasks-to-MJ048 navigation; tabs positioned higher; duplicate bottom Save Job removed. Preserve these confirmations. All other developer-claimed changes remain awaiting user tests.

**User-reported OPEN bug:** Activity tab failed to open. **Root cause established from shared component and tenant API:** Activity read `data.config.modules.siteVisits`, but tenant `GET /api/admin/jobs/[reference]` returns no `config` field. This caused a render-time TypeError. `28a22cbd` passes the loaded tenant `crmConfig` as a typed Activity prop, removes `data.config` dereference and handles absent activity/audit arrays. User verification of repair still OPEN. `ff190696` adds inline Activity errors and retains unsent form on failure; success reloads timeline.

**Requested layout:** `28a22cbd` sets Overview, Activity, Quote, Invoice, Costs & Payments, Workforce, Files, Split Job/Order order. `b4c26ca1` left-aligns reference and job title, moves Back to Jobs to right, displays compact status/next action, restricts Due Date/Manager/Final Quote/Customer Balance summary to Overview and removes persistent large financial/priority cards. `b5c2a255` normalises card padding and separates Quick Edit from customer/job details. Quick Edit already offers editable manager with historical value preservation; authenticated editing remains UNCONFIRMED.

**Costs & Payments:** `95f4eebb` distinguishes recorded actual job costs, estimates without actuals, agreed workforce costs, indicative payments received and customer balance; explicitly warns figures may be unverified and not interchangeable. `6c004b49` adds explicit confirmation and safe form preservation on payment, cost and material-order write failures. This is presentation/write-safety, not reconciliation or proof that amounts are final.

**Tests and deployment:** `5f3761a3` added source regressions. Older regression tests assumed a permanent Job priorities row and were updated in `58e81568` and `b4ec9f41` to reflect requested Overview-only layout and Activity error state; latest regression CI SUCCESS. Shared core v1.0.13 `c187bc98` package/release SUCCESS and master Vercel READY. M&J pinned to v1.0.13 at `a9f7d0a5`; verify its Vercel READY separately. No real financial or operational records modified.

**Still OPEN:** user retest Activity open/log/timeline, authenticated manager editing, Job Items MJ048 empty/append/revision/history, responsive desktop/mobile, Quote/Invoice boundaries, Files/Workforce, payment correctness and permission gates. All cross-page financial, invoice routing, Xero and blueprint issues remain OPEN and deferred. Audited full requirement gates unchanged 10/20 implementation (50%), 10/20 integration-tested (50%), 0/20 authenticated accepted (0%).
