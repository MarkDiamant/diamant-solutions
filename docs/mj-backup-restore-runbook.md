# M&J production backup and restore verification — required before migration

**Status: NOT DONE.** The connected Supabase integration supports read-only SQL inventory but exposes no downloadable full PostgreSQL backup or private Storage-object byte export. Do not describe SQL counts, a schema manifest, or a Supabase branching operation as a verified backup.

## 1. Database: independently verified full backup

1. In the **M&J** Supabase dashboard, check Database > Backups for a completed recoverable backup and record its exact timestamp, retention and available restore mechanism. A backup listing is not enough: prove restoration in an isolated project.
2. Arrange an independent full PostgreSQL custom-format dump using an authorised database administrator and securely supplied M&J database credentials, e.g. `pg_dump --format=custom --no-owner --no-acl --file=<encrypted-private-path>/mj-full-<UTC-timestamp>.dump <private-connection-URI>`. Do **not** paste the URI, password or dump into GitHub, CI logs, this chat or the public demo.
3. Confirm that the dump covers application schema/data, `auth` identity dependencies, enum definitions, indexes, triggers, functions and policies as appropriate. Supabase-managed roles/auth/storage infrastructure may require separate restore steps; document all exclusions.
4. Record dump size and SHA-256 in a restricted-access manifest, then restore to a **new isolated PostgreSQL/Supabase environment**. Run `scripts/migration/mj-readonly-reconciliation.sql` on the restored copy and compare with the same consistent snapshot of the source.

## 2. Storage: independently export and verify every object

- Private source bucket: `mj-job-files`. Two objects were present at inventory time, **one not referenced by the `mj_files` table**. Do not exclude or delete the unreferenced object.
- Using authorised server-side credentials **outside the source repository**, enumerate all object keys, sizes, MIME types, versions if supported, and ETags/metadata. Download **every** object to encrypted private backup storage, calculate SHA-256 on actual bytes, and retain a restricted manifest.
- Restore the two objects to an isolated private bucket with equivalent access controls. Download each restored object and compare its byte-level SHA-256 against the original backup. Do not treat metadata size or an ETag as a substitute for this check.
- Keep any signed URLs, file contents and service credentials out of GitHub and public CI.

## 3. Auth and Xero

- Inventory the two M&J Auth identities privately. Central DS Auth may have different user UUIDs; map identities and verify login/permissions on staging without copying password hashes into application tables.
- The source `mj_xero_connection` has one record with encrypted token columns. Do **not** copy ciphertext blindly: first verify key compatibility and tenant-specific encryption, otherwise reauthorise Xero at cutover. Test webhook deduplication and disable duplicate active consumers before enabling central write access.

## 4. Required evidence to mark backup complete

- Backup UTC timestamp, encrypted backup location, SHA-256 and retention.
- Isolated restore project, restoration log and signed-off table counts/financial totals/FK integrity.
- Storage object manifest and byte-level original/restored SHA-256 comparison.
- Auth/Xero handling plan, rehearsal results, explicit rollback steps.
- A final fresh snapshot and delta/cutover strategy for records created after the rehearsal.

**Do not** change M&J production schema, DNS, credentials or Xero connections to carry out this preparation. Do not mark this checklist complete merely because a backup may exist in the Supabase dashboard.
