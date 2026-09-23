# M&J reference tenant migration gate — DO NOT CUT OVER YET

The current M&J production database is the source of truth. The BMS preview branch must not use M&J's production service role key or connect to its production database.

## Central DS Supabase schema audit (read-only, 23 September 2026)

Verified via the connected DS Supabase project's public schema inventory:

- `business_software_tenants` already has `billing_mode` (`free` or `paid`), `reference_tenant`, `data_backend`, and `external_project_ref`. This supports M&J's permanently free tenant without a separate production database.
- `business_software_subscriptions` supports `billing_status='free'`; a Stripe customer or subscription ID is optional.
- The central project has the required operational tables, but their current reported row counts are zero. **This does not establish that M&J's production data has been copied.**
- **Blocking schema drift:** live DS `business_software_users` does not yet have `auth_user_id`, which the new verified-session guard requires. The staged RLS migration adds this column and its indexes. It has passed isolated PostgreSQL tests but must be reviewed and tested in a DS development branch before any live migration.
- The current public M&J tenant API can return a static fallback with `id='mjmetal'` when central lookup fails. The development branch removes that fallback: only a verified central registry UUID may be presented as a central tenant. The legacy M&J application stays in service until cutover.
- Do not mark `data_backend='central'` for M&J, activate a central tenant session, or change M&J's DNS until restored backup, data reconciliation, auth membership, RLS and rollback checks pass.

## Preconditions (all must be verified)

- [ ] Authorised read-only access to M&J Supabase project `jtviulkrcpyzzwedtzbw` and storage buckets. Current connector access was denied on 2026-09-23. Do not infer successful backups or counts.
- [ ] Obtain a verified point-in-time database backup **and** a separate versioned export of every storage bucket, including object metadata and checksums. Test restoring both into an isolated environment.
- [ ] Inventory tables, columns, primary/foreign keys, indexes, RLS policies, row counts, auth users, storage objects, integration settings and active webhooks. Record timestamps and checksums. Do not export plaintext OAuth tokens or service-role keys into source control.
- [ ] Establish tenant-specific isolation with deny-by-default RLS and explicit tenant IDs. Verify authenticated user A cannot read, write or enumerate tenant B's records, files or integrations. Test admin/service-role boundaries separately.
- [ ] Import into an **empty isolated staging tenant**, never into the live M&J project and never by overwriting production IDs. Preserve source-to-destination ID mapping and foreign keys.
- [ ] Reconcile table row counts, financial totals, relationships, file object counts and checksums, user memberships, and historical quotes/invoices. Check nulls and orphaned references.
- [ ] Test M&J jobs, quotes, invoice drafts, Xero read-only status, Gmail draft generation (without sending), WhatsApp share preview, payments read-only, roles and desktop/mobile UI against staging.
- [ ] Record exact cutover steps, downtime plan, production DNS/host changes, monitoring and tested rollback to the unchanged M&J deployment and database.
- [ ] Obtain specific approval before any irreversible operation or production cutover.

## Read-only database inventory SQL

Run only after authorised read-only access has been established. Never print customer rows or secrets into CI logs.

```sql
select schemaname, relname as table_name, n_live_tup as estimated_rows
from pg_stat_user_tables
where schemaname = 'public'
order by relname;

select table_schema, table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select conrelid::regclass::text as table_name, conname, contype,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
order by table_name, conname;
```

For exact row counts, use a dedicated read-only snapshot transaction once backup is verified; `n_live_tup` is an estimate and **not** reconciliation evidence. Inventory Supabase Storage through the authorised Storage API, not only `storage.objects`, and separately verify object bytes and hashes.
