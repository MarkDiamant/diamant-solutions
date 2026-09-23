# Isolated M&J staging preview configuration

This preview is **not the migrated production website**. It is an authenticated, read-only staging data verification screen at `/bms-mj-preview`, with an allowlisted server API at `/api/business-software/tenant-data`.

Use a **separate preview deployment/project**; never put staging credentials on the production Diamant Solutions Vercel environment or M&J production deployment. Set these environment variables on the isolated preview only:

- `DS_SUPABASE_URL=https://sfxeyydkwzlduflpmidd.supabase.co`
- `DS_SUPABASE_PUBLISHABLE_KEY`: staging publishable/anon key
- `DS_SUPABASE_SERVICE_ROLE_KEY`: staging service-role secret (server only; never NEXT_PUBLIC)
- `NEXT_PUBLIC_SUPABASE_URL=https://sfxeyydkwzlduflpmidd.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: staging publishable/anon key
- `BMS_STAGING_PREVIEW=true`
- `NEXT_PUBLIC_BMS_STAGING_PREVIEW=true`

The tenant-access guard permits `data_backend=staging` **only** when both `BMS_STAGING_PREVIEW=true` and the server's configured Supabase URL matches the exact staging project. A normal production deployment still requires `data_backend=central`. The browser's preview screen remains disabled unless both the public preview flag and public Supabase credentials are set. Restrict preview deployment access in Vercel as appropriate.

Before providing the preview to the user, verify the Vercel build is READY, use both existing staging logins to confirm that jobs/customers/payments/quotes/costs load, verify invalid or other-tenant JWTs receive 401/403, and confirm the preview never reaches the original M&J production database. This screen is for reconciliation; it does not replace the full M&J application and must not be treated as acceptance of its workflow parity.

Live source drift observed on 2026-09-23: one extra cost and three extra audit records versus staging. Refresh all source tables and Storage before cutover, not only those two counts. Keep the source system running and obtain explicit cutover approval.
