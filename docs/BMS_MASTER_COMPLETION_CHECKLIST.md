# Diamant Solutions master BMS acceptance checklist

Status is requirement-based, not based on commit counts or estimated percentages. Update each item only with evidence. **Implemented** does not mean authenticated end-to-end verified.

| Requirement | Status | Evidence / next gate |
|---|---|---|
| Shared tenant-aware design tokens | Implemented, automated regression | `app/bms-runtime/bms.css`, `BmsUI.tsx`, sidebar navigation test |
| Shared page, header, cards, forms, tables, modal, badge primitives | Implemented | `BmsUI.tsx`; migration of every existing page still open |
| All BMS pages migrated to central components | In progress | Demo operations migrated; audit remaining pages |
| Demo banner and industry selector clear sidebar | Code implemented, visual QA open | Verify desktop and mobile authenticated views |
| Mobile header, New Job, Ruby original image | Code implemented, visual QA open | Verify menu scroll and tenant logo at 320/390/768px |
| Flooring fictional tenant isolated data | Database integration verified | `supabase/demo/flooring_showcase_seed.sql`, rollback SQL |
| Flooring products, coverage and customer pricing | Database integration verified | `tests/flooring-showcase-connected.sql` |
| Flooring PO, goods receipt, reservation, picking, return | Database integration verified | Rollback SQL under service role |
| Flooring public demo interactive actions persisted | **Open** | Current demo buttons are browser-only simulations; do not claim complete |
| Flooring connected website catalogue preview | Read-only implemented | `/api/bms-demo/flooring-data` |
| Flooring demo safe reset | **Open** | Browser reset only; persisted tenant reset and access model not implemented |
| Flooring quotation, draft invoice, accounting | Partially implemented | Versioned quote, internal draft invoice; no connected provider for demo |
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
