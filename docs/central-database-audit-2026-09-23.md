# Central BMS database audit (read-only, 23 September 2026)

Source: connected Diamant Solutions Supabase project `iepqggrfenfqrqyzqyed`. No M&J production database was accessed and no database writes were performed.

- Central tenant registry: 1 record, reference M&J tenant UUID `3ebc2265-8842-4826-b464-71783d6cf841`.
- Reference subscription: `free`, 1 included + 1 extra user, AI enabled. Do not charge this tenant.
- Central CRM business-data tables (customers, jobs, quotes, invoices, payments, files, people and related entities): currently empty. **This is not an M&J backup** and must not be interpreted as a successful migration.
- `business_software_tenants`, tenant settings, subscriptions, users, jobs and customers have RLS enabled. A read-only catalog query returned **no `pg_policies` rows for any `business_software_%` table**. RLS without policies normally denies ordinary role access, but privileged service-role access bypasses RLS. This is not proof of cross-tenant isolation for future tenant-facing APIs.
- Tenant UUID foreign keys exist across business tables. Verify cross-tenant foreign-key consistency, authenticated membership, Storage policies and service-role endpoint authorization before connecting real customers.
- Current tenant-registry API on the architecture branch was corrected to return the canonical UUID rather than incorrectly using the slug as `id`.

## Required before any real tenant cutover

1. Design and apply authenticated tenant membership policies to the **central** database in a reviewed migration, and verify allowed/denied operations with two isolated test tenants.
2. Audit every privileged Next.js API endpoint to require server-validated tenant membership, not a client-provided slug or hostname alone.
3. Verify Storage bucket policies and OAuth token scoping with separate test identities.
4. Reconcile a restored **copy** of M&J's production data; the current central tables contain no migrated M&J CRM records.

M&J's live database and existing Vercel deployment must remain untouched until the migration gate is satisfied.
