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

## Further staging security tests completed

- A synthetic user A was inserted into Auth and given active membership of M&J in a single rolled-back staging transaction. A synthetic user B and second tenant were also created in that transaction. Under user A's `authenticated` role/JWT subject, `bms_is_active_member` returned true for M&J and false for B, with exactly one visible customer, one tenant and one membership. All synthetic rows were rolled back.
- A separate rolled-back test created one Storage metadata object under each tenant UUID in the private `bms-job-files` bucket. Under user A, exactly one object was visible, belonging to A's tenant. Actual object bytes, upload/download and signed URL behaviour remain untested.
- The private Storage read policy was committed to `supabase/migrations/staging_only_bms_private_storage.sql`. No client-side write policy is granted; writes require a verified server route.
- Post-test staging check: one M&J tenant, zero membership/customer/storage object rows and one private Storage bucket. No synthetic test records persisted.

## Pending user's one-time source export

- The local runtime has the original 407,651-byte custom-format `MJ-full-backup.dump` but lacks `pg_restore`, so it cannot yet parse the archived row data here. The user has a working PostgreSQL 17 installation on Windows.
- Prepare a `pg_restore --data-only --column-inserts --schema=public` SQL export from that existing dump and upload it directly to this chat; keep the SQL and ZIP private. After receiving it, map rows into isolated staging, reconcile all counts/totals, and perform workflow tests. **Do not treat the SQL export as a new source snapshot**; it represents the same point-in-time dump.

## Uploaded data-only SQL export received and verified

- The user uploaded `MJ-data-for-staging.zip` (SHA-256 `847b611d8b38add0d0b2c6df08f019626083f0e7908c8a171065a8678cebe2e3`). It contains a 262,286-byte `pg_restore --data-only` SQL export with PostgreSQL COPY statements.
- Parsed all 16 M&J tables and independently reconciled source rows: 2 admin users, 586 audit events, 29 customers, 1 file, 25 job costs, 8 job/subcontractor assignments, 32 jobs, 22 payments, 1 quote, 3 subcontractors, 1 Xero connection; all other source tables zero rows.
- Financial totals independently recomputed from uploaded data: customer receipts £12,325, subcontractor payments £8,330, actual job costs £17,852.70, quote £900; zero orphan job/customer relationships.
- A confidential **staging-only** SQL transformation was generated locally at `/mnt/data/mj-migration/MJ-staging-import-CONFIDENTIAL.sql` with all 586 audit records and transaction-level row/financial reconciliation. It is deliberately **not committed** to GitHub. Real source Auth user IDs are retained in a staging-only legacy field; login email addresses do not exist in the source export and must be mapped securely to actual central Auth users before activation. Xero ciphertext is deliberately not copied across encryption contexts: preserve the external Xero tenant ID and require reauthorisation.
- The staging Storage source ZIPs passed CRC and SHA checks. Two objects are mapped to `bms-job-files/<tenant-uuid>/...`: the 2,201-byte `_crm/settings.json` and 405,787-byte `MJ018-Quote.pdf`. No actual bytes have been uploaded to Supabase Storage yet.
- A synthetic staging transaction successfully inserted representative customer/job/person/assignment/payment/cost/quote/file/audit/integration rows and rolled back. This checks major FK paths but **is not** an actual 610KB import test.
- Supabase staging security advisor reports six RLS-protected service-only tables with no policies (intended no direct browser access) and one warning for the callable membership SECURITY DEFINER function (used by RLS; review grants). Staging performance advisor reports 26 missing FK indexes in the structural clone, which is not yet performance-parity with production.
- The connector can execute SQL strings but cannot directly consume private container files. An additional controlled import path or one-time SQL editor execution is needed to transfer the generated confidential SQL to staging. Production is unchanged.

## Actual staging import independently verified

- User ran the confidential SQL in isolated staging and received success. Independently queried project `sfxeyydkwzlduflpmidd`: 29 customers, 32 jobs, 22 payments, 25 job costs, 586 audit events, 3 people, 8 job assignments, 1 quote, 1 file metadata row and 2 BMS users.
- Financial totals match the original backup exactly: customer receipts £12,325, subcontractor payments £8,330, actual job costs £17,852.70, quote total £900. No orphan customer/job, job assignment, payment, quote or cost rows; job sequence and max imported job sequence both 32. All 32 jobs have nonnull statuses.
- `auth.users` has 0 records and both imported BMS users lack `auth_user_id`; these are **invited placeholders, not active login accounts**. Must invite real users, verify email identity, map auth IDs and test real session RLS before cutover. No guessed emails or synthetic production accounts.
- `storage.objects` still has 0 objects, so quote PDF and CRM settings JSON bytes are not uploaded yet. The two verified objects were packaged locally in `MJ-STAGING-STORAGE-PRIVATE.zip` and a local-only PowerShell upload/remote-SHA verification helper was created at `upload-staging-storage.ps1`. Its service-role key is requested interactively from the user and is never stored in the script or chat. The package and script contain private business data and must not be committed.
- Production projects and production website are unchanged. A fresh live-source delta check is mandatory before final cutover because this verified import is a snapshot.

## Storage confirmed and staging FK indexes added

- User's fixed uploader reported both objects uploaded with matching remote SHA256. Independently queried staging `storage.objects` and confirmed exactly the private `_crm/settings.json` and `MJ018-Quote.pdf` objects under M&J tenant UUID. Never copy sensitive contents or keys to repository.
- Confirmed staging users Mark `mark@mjmetal.co.uk` and Jonathan `jonathan@mjmetal.co.uk` exist as invited BMS membership placeholders. There are still no staging Auth users; do not activate memberships without real Auth IDs.
- Applied staging-only migration `staging_bms_fk_indexes_20260923`: created indexes covering public BMS foreign-key columns. Re-ran performance advisor: unindexed-FK notices reduced from 26 to zero (35 unused-index informational notices expected immediately after creation). Production unchanged.
- Next action requiring user: use staging Supabase Dashboard Authentication > Users > Invite user to invite both verified addresses. Then assistant can query `auth.users`, map verified IDs to BMS memberships, test real-session RLS and continue staging frontend validation. No production cutover before final delta and approval.
