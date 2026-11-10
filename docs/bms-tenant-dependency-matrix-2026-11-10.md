# BMS deployment and dependency matrix (read-only audit, 2026-11-10)

| Surface | Vercel project | Source | Production version evidence | Data boundary | Status |
|---|---|---|---|---|---|
| Standalone BMS, `bms.diamantsolutions.co.uk` | `diamant-solutions` | `MarkDiamant/diamant-solutions` | production SHA `80d04da85`; canonical package in `main` 1.0.43 (not independently measured runtime bundle) | central BMS tenant-scoped tables | UI source shared, browser unverified |
| Embedded demo, `diamantsolutions.co.uk/software` | `diamant-solutions` | same repository and shared dashboard components | same production deployment SHA; package in `main` 1.0.43 | fictional demo API handlers and demo storage | API **not behaviorally equivalent** to real BMS: demo POST `jobs` currently returns hardcoded `DS043` and does not persist a new job |
| M&J, `mjmetal.co.uk` | `mjmetal` | Vercel metadata: `MarkDiamant/mjmetal`, `main` SHA `de264fff` | commit message explicitly reports shared-core 1.0.38 | external Supabase project `jtviulkrcpyzzwedtzbw` referenced by central tenant registry | source inaccessible; fork vs package consumption unverified |
| M&J central host, `mjmetal.diamantsolutions.co.uk` | `diamant-solutions` wildcard/host alias | canonical repository | main 1.0.43 source; routing and runtime behavior not authenticated | central tenant record `mjmetal`, `data_backend=central`, external project reference retained | distinct host from `mjmetal.co.uk`; routing requires verification |
| Flooring showcase tenant | `diamant-solutions` host routing, exact public host unverified | canonical repository | main 1.0.43 source | central tenant registry `flooring-showcase-demo`, active | no separate Vercel project identified |
| Suspended acceptance tenant | `diamant-solutions` host routing | canonical repository | main 1.0.43 source | central tenant registry `acceptance-fictional-20261105`, suspended | not an active release target |
| Isolated acceptance Preview | `diamant-solutions` Preview | branch `bms-signup-acceptance-hardening-20261109` | shared core 1.0.44 staged, not published | isolated Supabase `mhncjudrhevvbmsbvkta` | build READY at `2641dd76`; authenticated browser unverified |

## Access finding
GitHub App installation `157726111` for `MarkDiamant` advertises `repository_selection=all` but its repository-list API exposes only **19 repositories**, none named `mjmetal`. Vercel's independently observed deployment metadata explicitly names `MarkDiamant/mjmetal`. The repository may be deleted, transferred, renamed, uninstalled or hidden from the linked GitHub principal; the exact GitHub state cannot be resolved with current credentials. Grant access or provide a current repository URL and appropriate installation permissions. Do not create a substitute repository.

## Compatibility and release blockers
1. Release workflow currently publishes an immutable core package but does not perform downstream deployment. Staging PR workflow was added on the acceptance branch, automatically triggered by a published release and intentionally **never merges** production. Requires `BMS_TENANT_RELEASE_TOKEN` with access to M&J; it is not yet exercised.
2. Version-parity and deployment inventory scripts plus mock regression tests are included in the Preview build. Their coverage is a prerequisite, not proof of live parity.
3. M&J source, lockfile, package archive integrity, GitHub Actions status and deployment preview remain inaccessible. No universal release, rollback or source-divergence certification possible yet.
4. Embedded demo's separate job creation handler has a concrete behavioral mismatch: it returns a fixed fictional reference and does not save, so Quick Add and Full Job cannot be certified equivalent. This must be corrected and browser tested before release.
5. Actual authenticated Playwright browser testing cannot be run from this environment: no browser automation connector is available and container DNS cannot reach Preview. Do not substitute static tests for real browser acceptance.

All production databases, deployments, branding and settings remain unchanged.

## Historical M&J source-consolidation evidence from Vercel
Inspected 100 M&J deployment records. Historical commit messages explicitly state: `Move full JobDetail.tsx interface implementation into BMS shared core`, `Move full CrmDashboardV3.tsx interface implementation into BMS shared core`, `Remove duplicated tenant UI formatters and use canonical BMS presentation helpers`, `Replace duplicated tenant interface with shared BMS core re-export`, `Pin BMS package release tarball with SHA-256 integrity in tenant lockfile`, and `Import ... directly from immutable canonical BMS package`. These strongly support a past consolidation and package adoption, but **cannot establish that all duplicated code is now absent**. Current M&J source tree and lockfile are still required for a definitive audit. The latest 10+ deployments indicate automatic shared-package consumption through v1.0.38, then no newer deployment.

## Implemented acceptance-branch safety controls
- Source-duplication scanner rejects copied core files and large implementations at canonical wrapper paths, while allowing thin package re-exports.
- Rollback readiness gate requires old immutable deployment, package integrity, verified database backup, backward-compatible migration and an actual rollback rehearsal for each tenant. This is **not** a completed rehearsal.
- Isolated Preview build runs parity, source-duplication, inventory and rollback fixture tests. It does not publish, merge or promote to production.
- Authenticated Playwright workflow loads a required browser storage state, but no real session secret is currently available and no browser run has been executed.

## Additional critical routing finding
The canonical `middleware.ts` currently recognises tenant hosts only when they end with `.diamantsolutions.co.uk`, excluding `bms.diamantsolutions.co.uk`. Consequently **`mjmetal.co.uk` and `www.mjmetal.co.uk` are not presently routed as tenants by the canonical middleware**, even though Vercel attaches those domains to the separate `mjmetal` project. Moving M&J to the canonical deployment therefore requires an explicit, authenticated host-to-tenant mapping and Vercel domain transfer. Merely adding the domain to the canonical Vercel project without updating tenant resolution would risk serving the wrong application or data. This is a concrete architectural obstacle to one-deployment distribution, and a controlled migration is necessary. Production remains unchanged.
