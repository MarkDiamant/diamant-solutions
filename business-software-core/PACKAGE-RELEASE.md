# Single-package migration: release gate

Canonical source: this folder in MarkDiamant/diamant-solutions. Tenant: MarkDiamant/mjmetal.

## Implemented
- M&J-tuned default CRM, job, quotation and PDF interfaces are byte-identical in canonical BMS and the tenant mirror.
- Shared server handlers, tenant resource adapter and contextual Ruby behaviour are canonical BMS modules.
- A scoped versioned package manifest and non-publishing pack validation workflow are present.
- Both applications currently deploy independently. No production database, storage, tenant IDs, migrations, or records have been changed for this package preparation.

## Required before replacing the M&J mirror
1. Remove application-root `@/` imports from package-owned code, or provide an explicit host-adapter contract, and validate package consumption in an isolated test app.
2. Publish an immutable version of the package to a trusted registry with controlled access. Do not expose private credentials in Git, logs or chat.
3. Grant the M&J Vercel build a read-only package registry credential via project environment settings, or migrate both apps to a monorepo workspace with one canonical package. Never commit tokens.
4. Switch M&J imports and package-lock to the pinned package version in a preview deployment. Verify authenticated CRM, customer edits, Ruby, quote and PDF read/write flows against safe test records.
5. Compare record counts, sample customer/job/quote IDs and attachment access before and after. No database schema or data migration is required for a code-package change.
6. Only after successful preview verification, promote production and remove the mirrored source files. Retain rollback to the previous READY deployment.

**Do not remove the live M&J mirror before these gates pass.** A green TypeScript build does not prove customer saves or PDFs work under an authenticated session.
