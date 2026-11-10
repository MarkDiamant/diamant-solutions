# BMS shared core 1.0.44: controlled release gate

Branch: `bms-signup-acceptance-hardening-20261109`. Production deployment is **not authorised**.

## Current production gap
M&J Vercel project `prj_oOg8V3r5UALCtUPvfq4LL1a9jjBS` (`mjmetal`) reports its last production commit `de264fff` with message “Automatically consume shared BMS core v1.0.38”. Therefore changes to the isolated `diamant-solutions` Preview **do not update M&J**. The canonical shared core on this branch is staged at `1.0.44`, not yet published. The M&J GitHub repository `MarkDiamant/mjmetal` was inaccessible to the connected GitHub integration during validation; its lockfile and actual integration cannot yet be reviewed or updated.

## Mandatory gates before approval
1. Preview build READY for final code commit, tests pass, no runtime errors.
2. Authenticated Playwright browser run against isolated Preview: two-option dropdown; pending highlight and duplicate-click protection; inline Quick Add blank/reset, provisional reference, cancel and save stays on Dashboard with optional link; unsaved tabbed Full Job draft persists across tabs, cancel confirms discard, save opens saved full detail; network failure recovery.
3. Isolated DB: two authenticated concurrent job saves with unique tenant-scoped references, rollback recovery, cross-tenant denial and no sequence consumption on cancel; confirm migration history and RLS.
4. Review actual M&J deployment routing and integration against released immutable core `1.0.44`; create tenant-specific Preview builds for M&J and every other tenant, test with synthetic accounts and no production writes.
5. Publish shared package only after gates, pin dependency and lockfile for each tenant, validate all Preview builds, create rollback plan to prior package versions and capture pre-deploy backups.
6. Request explicit production approval. Deploy in controlled sequence and verify actual live M&J plus other tenants after approval. Never deploy automatically.

## Protection
Do not mutate production tenant data, apply isolated migrations to production, publish package or deploy production without explicit approval. Existing customer data and historical job references must be preserved.
