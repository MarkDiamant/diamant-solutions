# Central DS versus M&J: verified schema gaps (23 September 2026)

Read-only comparison of 216 columns in 16 M&J public tables against 280 columns in the live DS business-software tables. No data was imported and no live schema was changed.

Before importing M&J, an isolated staging migration must preserve these source fields:
- Customers: `xero_contact_id`.
- Activities: `next_action_assignee`.
- Job costs: `paid_at`, `due_at`.
- Jobs: `written_off_amount`, `written_off_at`, `write_off_reason`.
- Admin users: original `user_id` must map to a verified central Auth identity; preserve `initials` as a historical manager identifier.
- Audit history: source UUID `id`, optional `job_id`, original `changes` JSON and `created_at` must survive the move to the central audit table, whose primary key is bigint and whose fields are named differently.
- Integration events: do not flatten the source's `source`, `external_id`, `event_type`, `payload`, `processed_at` into generic audit rows. Create a separate tenant-scoped idempotency ledger preserving the source's unique external-event semantics.
- Job/subcontractor assignment: map `subcontractor_id` to `person_id` without losing the original source ID.
- Xero connection: source `tenant_id` is an **external Xero text ID**, not the central BMS tenant UUID. Preserve it separately, convert `scopes` to an array and `expires_at` to `token_expires_at`. Encryption key compatibility or reauthorisation is a cutover prerequisite.
- Xero invoices: map `xero_invoice_id` to `external_invoice_id` and preserve unique provider IDs.
- Subcontractor `capabilities`: source is text, destination is text array; establish a reviewed lossless parser and round-trip tests.

M&J enum `mj_job_status` has 22 statuses; central status is text. Test all historical values. `mj_manager` is an enum, while central actor/manager fields are text. The two private Storage objects require tenant-scoped keys, private RLS and byte-level restore checks.

**Blocking live schema drift:** central `business_software_users` has no `auth_user_id`. The existing `supabase/migrations/staging_only_bms_membership_rls.sql` adds this column and authenticated read-only membership policies, but has not been applied to live DS.

**Backups (updated 23 September):** The uploaded database dump and both Storage ZIPs were hashed and ZIP integrity checked. The user ran a successful isolated PostgreSQL 17 restore of all 16 M&J public tables, indexes, triggers, FKs and policies with local Auth stubs; all source counts and financial totals reconciled to the recorded snapshot. This is not a full managed Supabase Auth/Storage recovery drill. Storage ZIP entries total 407,988 uncompressed bytes; target upload/download checksum verification is still outstanding.

**Status:** source and target schema inventories and isolated public-schema restore verified. Central import and cutover remain blocked pending isolated central staging, tenant Auth/RLS and Storage tests, Xero reauthorisation and rollback validation. No live production changes authorised.
