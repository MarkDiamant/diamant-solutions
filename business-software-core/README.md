# Diamant Solutions Business Management Software core

This directory is the canonical product source for the shared Business Management Software UI and product configuration.

## Architecture

- Diamant Solutions owns the core product.
- M&J Metal is tenant #1 and a reference tenant, not the product master.
- Tenant-specific business data, branding, integrations and configuration must stay outside shared UI logic.
- Demo data must remain fictional and isolated from production tenant data and external writes.
- Changes to shared product UI are made here first, then synchronised into tenant deployments while the repositories remain separate.

## Transitional deployment

The current M&J deployment still contains a synchronised runtime copy of these components. Do not treat that runtime copy as the canonical source. The next migration stage is to make tenant builds consume this core directly so manual synchronisation can be removed.

## Product default and tenant customisation policy

- Every requested feature, bug fix, workflow, Ruby improvement, quote editor change and PDF correction belongs in the canonical BMS core first. M&J is the first tenant and uses these defaults, not a separate product.
- Current M&J workflow preferences are the BMS defaults until product requirements change. Never hardcode metalwork-specific language, sample data, prices or contact details in shared logic.
- Tenant configuration controls identity, branding, industry wording, permissions and explicitly approved exceptions. New tenants inherit core defaults automatically.
- Demo tenants run the same shared features but retain their own fictional and isolated data. Never expose real tenant records or credentials in demos.
- While tenant runtime components remain copied into separate repositories, synchronise each core change into those runtime copies and verify both builds. A successful core-site build alone does not prove tenant integration.
- Prefer eliminating runtime copies through shared-package imports in a future migration; do not claim that migration is complete until tenant apps actually import the shared code.

## Implemented shared server ownership (October 2026)

- `server/ruby-handler.ts`: canonical Ruby question handling, quote creation/update, permissions and pricing rules. Tenant API routes only inject permission/database adapters.
- `server/quote-tidy-handler.ts`: canonical AI quotation tidy with server-side item/price preservation.
- `server/quote-pdf-handler.ts`: canonical PDF generation, storage retrieval and fresh download of existing quotations.
- `lib/ruby-quote.ts` and `lib/quote-pdf.ts`: canonical Ruby quote validation and PDF generation.
- M&J currently mirrors these core files under `business-software-core/` and re-exports its legacy `lib/crm/` entrypoints. The app routes are thin tenant adapters mapping BMS logical resources to M&J's existing tables and file bucket.
- This is a transitional mirror, not yet a single deployed package dependency. The shared admin UI also has remaining tenant-specific runtime copies. Keep core and mirrors in sync until a shared-package build migration is complete.
