# M&J migration checkpoint — 2026-09-23

This checkpoint supersedes earlier pending-login claims in the migration runbook. Development branch only; no production cutover authorised.

## Independently verified in isolated staging

- Staging project: `sfxeyydkwzlduflpmidd`, tenant `3ebc2265-8842-4826-b464-71783d6cf841`.
- Both existing M&J login email identities were created in staging by a user-run private password script. The script reported password sign-in success; do not store plaintext passwords or service-role keys.
- Both real staging `auth.users` records are email-confirmed, linked to their corresponding `business_software_users.auth_user_id`, and marked `active`.
- Transaction-scoped authenticated-role/JWT impersonation using each *real staging user ID* passed a read visibility check; Jonathan saw 32 jobs, Mark saw both private Storage metadata objects. These are SQL-level permission tests, not browser login or signed-download tests.
- Staging contains 29 customers, 32 jobs, 25 job costs, 586 audit events, and two uploaded private Storage objects. Both object bytes were independently verified after upload in the prior migration work.

## Live-source drift observed

- During a separate read-only connection to original M&J production, source counts were 29 customers, 32 jobs, 22 payments, **26 job costs**, and **589 audit events**. Staging contains 25 costs and 586 audit events from the earlier snapshot. Before cutover, migrate and verify the one additional cost and three audit events, plus any later changes in *all* source tables and Storage. Do not assume that counts alone prove row identity.

## Blocking release gates

1. Wire the real M&J Next.js UI and all existing server routes to the shared central tenant backend on a development branch. Preserve all workflows and enforce server-verified tenant identity for reads and writes; never use production source service-role credentials in a preview.
2. Verify production-build and end-to-end browser workflows for both real staging users, including jobs, quote PDF, payments, file download, Xero/Gmail safe read-only or draft flows, desktop and mobile. The existing staging SQL RLS tests do not replace these checks.
3. Reconcile source drift, refresh backup, verify storage and financial totals, and test rollback. Xero OAuth needs tenant-safe reauthorisation rather than copying ciphertext.
4. Validate schema parity and cross-tenant reference integrity; the isolated staging clone was built from central table definitions but is not an exact production dump.
5. Obtain explicit approval before changing live hostnames, live DS or M&J production databases, or disabling the existing deployment.

## User actions to group at readiness

- Preview acceptance test with both existing accounts.
- Xero reconnect through a verified tenant-scoped OAuth flow.
- Final explicit cutover approval after a complete reconciliation and tested rollback.
