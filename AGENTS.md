# BMS architecture and implementation rules (mandatory)

**Canonical product:** `MarkDiamant/diamant-solutions/business-software-core/`. BMS is the product. M&J Metal is the first tenant and its fine-tuned workflows are the **default for every tenant**. Do not treat M&J as a separate product.

1. Every new feature, bug fix, Ruby behaviour, quotation workflow, PDF, customer editor and UI change must be implemented in the canonical BMS core first, then consumed by tenant applications. Never develop a tenant-only duplicate of default behaviour.
2. Keep M&J's proven workflow as the default. Only branding, company data, industry wording, resource mappings, permissions and explicitly approved exceptions may vary by tenant. Do not hardcode metal-specific wording into shared defaults.
3. Tenant data must remain isolated. Demo accounts use the same features with separate fictional data.
4. Current deployment constraint: `mjmetal` is a separate GitHub repository and mirrors BMS core files. Its `components/admin` and `lib/crm` compatibility entrypoints should only re-export shared implementations. Update canonical files first and synchronise mirrors until the runtime imports a versioned package directly.
5. Any future tenant-specific override must be explicit, configured and documented, not copied business logic.
6. Ruby must use conversational context, infer unambiguous references, avoid needless clarification, verify successful writes and report what was actually changed. Never invent successful saves.
7. Validate TypeScript/build and production deployment for both `diamant-solutions` and `mjmetal` after changes. Do not call build readiness authenticated end-to-end verification.
8. Never alter real customer records, quotes or prices during testing without explicit authorisation.

**Migration status:** The large quote/CRM/admin components, Ruby handler, AI Tidy, PDF handler, customer-save handler, tenant resource adapter, quote formatting and presentation helpers are canonical BMS modules. The M&J repository mirrors these modules for deployment, rather than consuming a published BMS package. This physical mirror remains a temporary technical constraint, not permission to diverge.
