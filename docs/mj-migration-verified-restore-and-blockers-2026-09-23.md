# M&J migration status — 23 September 2026

## Completed and independently evidenced

- The user ran an isolated PostgreSQL 17 application-schema restore of the uploaded M&J custom-format dump. Pre-data, data, and post-data stages succeeded with local-only substitutes for Supabase Auth roles/functions.
- Restored counts: 2 admin users; 29 customers; 32 jobs; 0 activities; 3 subcontractors; 8 job subcontractors; 22 payments; 25 job costs; 1 quote; 1 file record; 0 integration events; 0 suppliers; 0 material orders; 586 audit events; 1 Xero connection; 0 Xero invoices.
- Financial checks: customer receipts £12,325.00; subcontractor payments £8,330.00; actual job costs £17,852.70; quote total £900.00; orphan jobs/customer links 0.
- The two user-uploaded ZIP archives passed ZIP integrity tests and contain one private `_crm/settings.json` object (2,201 uncompressed bytes) and one private `quotes/MJ018-Quote.pdf` (405,787 uncompressed bytes). Do not commit their contents.
- Source schema 16 tables/216 columns compared against central DS live schema. The staging-only source parity migration is at `supabase/migrations/staging_only_mj_source_parity.sql`. Auth membership and read-only tenant RLS migration is at `supabase/migrations/staging_only_bms_membership_rls.sql`.
- M&J mapping now directs source integration events to a separate tenant-scoped ledger, not generic audit events, and preserves the distinction between central tenant UUID and external Xero tenant ID.

## Explicitly not complete

- The isolated restore used *stubbed* Auth IDs and did not restore the Supabase managed Auth, Storage, Vault or Realtime services. It is a successful application-schema restore, **not** a full Supabase environment recovery drill.
- Uploaded Storage ZIP integrity and object byte counts are verified, but target Storage upload and tenant-scoped RLS are untested.
- Central DS development branching was attempted with user-approved cost $0.01344/hour; Supabase returned `PaymentRequiredException: Branching is supported only on the Pro plan or above`. No branch was created.
- No isolated central DS staging environment is currently available. No central import or live DS schema changes have occurred.
- Auth identities and central memberships, role-based write isolation, Xero key compatibility/reauthorisation, central Storage, all CRM workflows, cutover and rollback remain blocking.

## Release gate

Do not change M&J production, set its DS tenant `data_backend=central`, import into DS live operational tables, change DNS or retire M&J Supabase until a separate staging central database is available and all checks above have passed. Obtain separate approval before any production cutover.

## Staging environment established (23 September)

- User authorised creating a separate project in Diamant Solutions organisation. Supabase quoted a project creation cost of 0/month and the confirmation workflow succeeded.
- Isolated staging project ref: `sfxeyydkwzlduflpmidd` in `eu-central-1`, ACTIVE_HEALTHY. Production remains `iepqggrfenfqrqyzqyed`.
- Reconstructed 21 central BMS table definitions and 31 inter-table foreign keys from a read-only live schema inventory. This is a *structural staging clone*, not a full schema dump: production triggers, custom check constraints, unique indexes, original policies and non-BMS dependencies may differ.
- Successfully applied the existing staging-only source-parity and membership/RLS migrations. Staging has the M&J reference tenant UUID `3ebc2265-8842-4826-b464-71783d6cf841`, slug `mjmetal`, `billing_mode=free`, `data_backend=staging` and 13 member-read policies.
- Negative RLS test under `authenticated` role with a nonmember synthetic JWT subject returned `bms_is_active_member=false` and zero visible tenants/customers. A positive real Auth user and cross-tenant write test is still required.
- Staging operational records remain empty; the M&J dump's actual data have **not** been imported. The uploaded dump is a custom-format archive, and the available local runtime does not have PostgreSQL `pg_restore`; do not infer source rows exist in staging from structural migration success.
