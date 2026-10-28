# M&J live UI preservation snapshot (28 October 2026)

This folder holds exact source copies of the 18 `components/admin/*.tsx` files retrieved from the live M&J repository before any further consolidation. It is **not** imported or built by the canonical BMS. Its purpose is to prevent historical functionality from being erased while it is reconciled into the shared core.

**Do not delete the snapshot, switch M&J imports, or replace local components without verifying feature-by-feature parity.** Shared v1.0.32 is already deployed to M&J via package, but M&J still has local V4/V5 and other components.

Critical V4/V5 differences to reconcile: lost-job-value summary, activity history/show more, subcontractor payment history, mobile Quick Edit styling and Money Overview placement, lost/cancelled row highlights, job-reference matching and polling behaviour. Do not reintroduce one-second polling or DOM-injected styling merely to achieve textual parity. Retain the current functioning UI while moving the behaviour into native shared components.

Acceptance requires: compare each local file to its canonical implementation, record whether features are present or intentionally superseded, run shared build/regression tests, verify both Vercel production deployments and actual authenticated tenant workflows, then obtain user confirmation. Until then this snapshot is a recovery asset, **not evidence that migration is complete**.
