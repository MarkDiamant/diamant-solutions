# Architecture decision: one deployable BMS core, multiple tenant hosts

Status: **in progress; production M&J unchanged**.

## Single-source design

Keep one Next.js application in `MarkDiamant/diamant-solutions`. The canonical shared application components and business rules live under `business-software-core/`. The application layer imports that code; it must not copy or fork the shared components. The exact M&J source baseline is pinned in `business-software-core/mj-source-baseline.json`, with GitHub Actions checking each canonical source blob against the approved reference.

The existing M&J repository and Vercel project remain operational as a rollback target until the shared deployment is independently verified. **Do not configure automatic cross-repository writes or redirect the live M&J hostname as an intermediate step.** The hourly M&J sync PR workflow remains transitional and review-gated.

## Future tenant runtime

A single tested build of the shared application should serve BMS and all real tenant hostnames. Resolve the tenant from a validated hostname and authenticated tenant membership on the **server**. Never trust a client-supplied tenant slug or global client-side fetch rewriting for authorization. Tenant branding, feature flags, licensed seats, OAuth connections and billing live in tenant-scoped configuration. Shared changes are deployed once to the canonical application; a tenant exception must be explicit, tested and reversible.

Deploy the fictional demo as a separate Vercel project built from the canonical repository with server-side `BMS_DEMO_ONLY=true`. Attach `bms.diamantsolutions.co.uk` only after that project passes spoofed-host regression tests; never rely on Host or x-forwarded-host alone for isolation. The current shared marketing project is not yet configured this way. Keep the public fictional demo on an entirely separate demo-only API and synthetic records. It must not possess production integration credentials. The demo hostname must block non-demo API endpoints server-side; the browser rewrite is navigation convenience only.

## Release gates

1. Verify parity of all reference M&J components and all application routes; test real desktop and mobile rendering, not only source hashes.
2. Run structural, production-build and integration tests on the canonical preview. Resolve dependency and Next.js version differences. Remove `ignoreBuildErrors` after type errors are corrected.
3. Validate tenant isolation, authentication, billing, Gmail/Xero read-only flows and demo non-delivery using isolated test accounts.
4. Back up and reconcile M&J's database and storage, migrate a **copy** into staging, and prove rollback. See `docs/mj-tenant-migration-gate.md`.
5. Only after all gates pass, attach the M&J tenant hostname to the canonical deployment in a controlled cutover, retaining the original deployment and data intact. Do not change the public marketing website unnecessarily.
6. Provision future tenants via idempotent, webhook-verified subscription events with replay protection and auditable tenant/user creation. Preserve M&J's free reference status.

No production cutover is authorised by this document.
