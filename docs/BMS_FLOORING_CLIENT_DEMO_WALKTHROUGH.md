# Flooring BMS recording walkthrough (verified-only, 5 November 2026)

## Recording order (3 to 4 minutes)

1. Open **Flooring & Tiles Demo** at `https://bms.diamantsolutions.co.uk/flooring`. State that all people, products and figures are fictional.
2. Show **Dashboard** and the overview of existing fictional orders, enquiries and tasks. Do not promise that every action is live.
3. Open **Settings → Business details → What do you call your work?** and show **Orders**. This is a tenant setting; MJ Metal retains **Jobs**. Avoid changing settings during the recording.
4. Open **Price Book** and show the flooring materials with costs (oak laminate, LVT, porcelain tiles, underlay and scotia).
5. Open **Purchasing & Stock** to show the existing fictional purchase-order records and statuses. Do not demonstrate receiving goods or claim a stock update until a write has passed a live transaction test.
6. Open **Stock & Inventory** and show stock locations, quantities, available stock, and indicative valuation. Explain that valuation is estimated from Price Book cost, excluding VAT; it is not FIFO accounting valuation.
7. Open **Order allocations** and point out Reserve, Release, Issue and Return options, but do not click Save or claim persistence until authenticated end-to-end testing confirms them.

## Verified technical checks

- Shared BMS production build completed and both production domains served the same READY deployment (reverify latest commit before recording).
- Flooring page and stock GET endpoint returned HTTP 200.
- Server-side demo stock storage table accepted an isolated INSERT/UPDATE/SELECT test inside a rolled-back transaction.
- Fictional stock products and costs now use the same shared demo catalogue as Price Book and Purchasing.

## Not yet verified, so do not demonstrate as completed

- Reserve → partial release → issue → return through the actual browser, with persisted quantity and cost reconciliation.
- Goods Received posting to stock, allocations and financial costing in the demo.
- Stripe paid-seat reduction safeguards.
- All tenant-wide terminology surfaces.

Do not imply the demo is fully production-ready or that the fictional demo performs real financial transactions.
