# Diamant Solutions master BMS acceptance checklist

Status is requirement-based, not based on commit counts or estimated percentages. Update each item only with evidence. **Implemented** does not mean authenticated end-to-end verified.

| Requirement | Status | Evidence / next gate |
|---|---|---|
| Shared tenant-aware design tokens | Implemented, automated regression | `app/bms-runtime/bms.css`, `BmsUI.tsx`, sidebar navigation test |
| Shared page, header, cards, forms, tables, modal, badge primitives | Implemented | `BmsUI.tsx`; migration of every existing page still open |
| All BMS pages migrated to central components | In progress | Shared tenant-accent-aware compatibility styling now covers legacy forms, tables and focus across pages; individual page component migration and visual QA still open |
| Demo banner and industry selector clear sidebar | Code implemented, visual QA open | Verify desktop and mobile authenticated views |
| Mobile header, New Job, Ruby original image | Code implemented, visual QA open | Verify menu scroll and tenant logo at 320/390/768px |
| Flooring fictional tenant isolated data | Database integration verified | `supabase/demo/flooring_showcase_seed.sql`, rollback SQL |
| Flooring products, coverage and customer pricing | Database integration verified | `tests/flooring-showcase-connected.sql` |
| Flooring PO, goods receipt, reservation, picking, return | Database integration verified | Rollback SQL under service role |
| Flooring public demo interactive actions persisted | Implemented, authenticated E2E open | New manager-authorised `/api/bms-demo/flooring-actions` uses shared tenant-aware RPCs for sales, purchasing, goods receipts, reservations, picking, deliveries and returns; UI connected; production browser acceptance pending |
| Flooring connected website catalogue preview | Read-only implemented | `/api/bms-demo/flooring-data` |
| Flooring demo safe reset | **Open** | Obsolete browser-only simulation removed; transactional persisted demo reset not implemented |
| Flooring quotation, draft invoice, accounting | Implemented for isolated internal drafts, E2E open | Manager actions create quote revisions and internal draft invoices; no external accounting provider for demo |
| Purchasing, sales, stock and logistics master core | Partially integrated | Authenticated UI and role acceptance pending |
| Ruby document interpretation and confirmed actions | Open for end-to-end verification | Test each document type, confirmation, permissions, idempotency |
| Worker Portal, scheduling, timesheets and labour billing | Open for end-to-end verification | Role matrix and invoice evidence pending |
| QuickBooks integration | Open for authorised integration verification | Credentials/consent required for live provider link |
| Xero, Money Overview and matching | Open for reconciliation verification | MJ010 historical anomalies untouched |
| Quote versions, lead times and PDF output | Open for PDF visual and authenticated QA | Test quote revisions, exports, customer-specific terms |
| Tenant isolation and financial safety | Partial database verification | Multi-tenant rollback SQL; authenticated role matrix pending |
| Full desktop/tablet/mobile usability | Open | Authenticated screenshot and interaction QA needed |

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
