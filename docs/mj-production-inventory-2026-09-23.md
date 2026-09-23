# M&J production Supabase — read-only migration inventory

**Captured:** 2026-09-23. **Source project:** `jtviulkrcpyzzwedtzbw`, London `eu-west-2`, PostgreSQL 17, ACTIVE_HEALTHY. This is a *live, changing* source; the figures below are a read-only inventory, **not a backup, restore test or frozen migration snapshot**. Do not commit customer rows, OAuth ciphertext, auth tokens or service-role keys.

## Exact live row counts

| Table | Rows |
|---|---:|
| mj_admin_users | 2 |
| mj_customers | 29 |
| mj_jobs | 32 |
| mj_activities | 0 |
| mj_subcontractors | 3 |
| mj_job_subcontractors | 8 |
| mj_payments | 22 |
| mj_job_costs | 25 |
| mj_quotes | 1 |
| mj_files | 1 |
| mj_integration_events | 0 |
| mj_suppliers | 0 |
| mj_material_orders | 0 |
| mj_audit_events | 586 |
| mj_xero_connection | 1 |
| mj_xero_invoices | 0 |

**Supabase Auth:** 2 user records. **Storage:** one private bucket `mj-job-files`, 2 stored objects, 407,988 bytes according to object metadata; one matches the `mj_files` path and one is unreferenced by `mj_files`. Metadata counts are not an object-byte backup or checksum. **Note:** one `mj_files` row matches one Storage object by path; the other Storage object has no `mj_files` record. Preserve and classify **both** objects; do not delete either object.

## Financial reconciliation baseline

- 9 `customer_in` payment rows totalling **£12,325.00**.
- 13 `subcontractor_out` payment rows totalling **£8,330.00**.
- 25 job-cost rows; `sum(actual_amount)` **£17,852.70**.
- 1 quote row; `sum(amount)` **£900.00**.
- No orphan job-to-customer, payment-to-job, file-to-job, cost-to-job, subcontractor-assignment-to-job or quote-to-job references in the initial check.
- These are database field totals, not bank-verified balances. Re-run in a consistent read-only snapshot at migration rehearsal and immediately before cutover.

## Data mapping and constraints

| Legacy source | Central DS destination | Special handling |
|---|---|---|
| `mj_admin_users` + `auth.users` | `business_software_users` + central Auth | Central Auth identities need an authorised, tested mapping; do not assume same user UUID is already present. |
| `mj_customers` | `business_software_customers` | Preserve source IDs, Xero contact references and nullable fields. |
| `mj_jobs` | `business_software_jobs` | Preserve reference and sequence uniqueness, enum statuses, dates, monetary values and customer FK. |
| `mj_activities` | `business_software_activities` | Preserve event history, if any appears before cutover. |
| `mj_subcontractors` | `business_software_people` | Preserve subcontractor identities and capability fields; validate role conversion. |
| `mj_job_subcontractors` | `business_software_job_people` | Reconcile job/worker links, costs, deposits and assignment statuses. |
| `mj_payments` | `business_software_payments` | Map directions `customer_in`, `subcontractor_out`, `supplier_out` exactly; preserve sums. |
| `mj_job_costs` | `business_software_job_costs` | Preserve estimated/actual/paid amounts separately. |
| `mj_quotes` | `business_software_quotes` | Preserve versions, VAT, status, amount and linked PDF path. |
| `mj_files` + Storage bucket | `business_software_files` + central private tenant-scoped Storage | Copy **both** Storage objects, inspect unmatched object and verify byte-level hashes; avoid public exposure. |
| `mj_suppliers`, `mj_material_orders` | matching central tables | Preserve nullable supplier references and existing statuses. |
| `mj_audit_events` | `business_software_audit_events` | Preserve complete historical log and original actor; do not rewrite actor as migrator. |
| `mj_xero_connection` | `business_software_integrations` | **Do not dump or commit ciphertext**. Verify encryption/key compatibility or reauthorise Xero after migration; never run both webhook consumers concurrently. |
| `mj_xero_invoices` | `business_software_invoices` | Preserve external IDs and prevent duplicate invoice creation. |
| `mj_integration_events` | central integration/audit event design | Preserve idempotency and external-event uniqueness. |

M&J public tables have RLS enabled with authenticated MJ-admin policies. Live security advisor reports four `SECURITY DEFINER` functions executable by `anon` and `authenticated`, plus disabled leaked-password protection. Review each function before changing privileges; production behaviour must not be disrupted by speculative permission edits.

## Additional source-schema details

- Full source column manifest: `docs/mj-production-schema-manifest-2026-09-23.json` — 216 columns across all 16 M&J public tables, captured from live PostgreSQL information_schema; no customer rows or secrets included.
- All 16 tables have planned destinations in `scripts/migration/mj-table-mapping.json`. The integration-event target requires review: generic audit events may not preserve webhook idempotency.
- Job status distribution: 12 `awaiting_customer`, 8 `declined`, 6 `completed`, 3 `awaiting_information`, and one each `confirmed`, `in_progress`, `quote_sent`. The source enum has 22 possible statuses; do not collapse historical values.
- Source `mj_manager` enum values: `MD` and `JB`. Map actor/assignee values to authorised central memberships; source and central Auth UUIDs need not match.
- Six noninternal triggers: customer/job/subcontractor updated-at, completed-job settlement guard, payment completion reconciliation, and Xero invoice completion reconciliation. Migration must not trigger real-world integration side effects.
- Source database size was approximately 13 MB at inspection. This is not a backup or restore guarantee.
- Repeatable-read reconciliation SQL: `scripts/migration/mj-readonly-reconciliation.sql`.

### Verified private Storage access controls

The `mj-job-files` bucket is private. Its four `storage.objects` policies allow authenticated users to SELECT, INSERT, UPDATE and DELETE only when `mj_is_admin()` is true and the bucket ID matches. Central DS Storage must replace this legacy single-business admin check with **tenant-scoped membership checks** and test that tenant A cannot list, download, upload, overwrite or delete tenant B's objects. Do not make the bucket public or rely on an object-key prefix without matching RLS.

### Exact source enums

`mj_job_status`: `new_enquiry`, `awaiting_information`, `site_visit_required`, `site_visit_booked`, `estimate_preparing`, `estimate_sent`, `quote_preparing`, `quote_sent`, `awaiting_customer`, `interested_not_ready`, `customer_unsure`, `confirmed`, `deposit_requested`, `deposit_paid`, `materials_ordered`, `fabrication`, `installation_scheduled`, `in_progress`, `awaiting_final_payment`, `completed`, `declined`, `cancelled`.

`mj_manager`: `MD`, `JB`. All enum values, including currently unused statuses, must survive historical import and round-trip export.

## Remaining gates

1. Obtain a verified **point-in-time full PostgreSQL backup** and independent **versioned Storage export**. This connector exposes SQL and Storage metadata, **not a verified downloadable database/Storage backup**. Record backup timestamp, object manifest, checksums and perform a restore drill.
2. Inventory exact enum definitions, triggers, RPCs, auth identity mapping, all storage-object bytes, policies and indexes; compare with central DS table schemas.
3. Reconnect **Diamant Solutions Supabase** for an isolated development branch; stage schema changes and test RLS and migrations against synthetic data first.
4. Import a *copy* of M&J into isolated central staging under tenant `3ebc2265-8842-4826-b464-71783d6cf841`; keep M&J's `billing_mode=free` and subscription `billing_status=free` with no Stripe subscription.
5. Reconcile all table counts, payment and cost totals, FK integrity, Auth membership, historical audit records, file metadata **and byte-level hashes**. Test Xero in read-only mode, job/quote/payment flows, mobile/desktop, and rollback.
6. Only after explicit cutover approval, atomically route M&J to the canonical DS app and DS Supabase; keep its old app and DB unchanged and available for rollback.

**Do not** apply migration DDL, export sensitive records to source control, switch live DNS, delete source records or charge M&J as part of this inventory.
