# Flooring BMS recording walkthrough (verified-only, 5 November 2026)

## Record now: https://bms.diamantsolutions.co.uk/flooring

**Safe read-only route: Dashboard → Settings (Orders) → Price Book → Purchasing & Stock → Stock & Inventory → Order allocations.** Do not click stock mutation actions. Narration: “This is a fictional Flooring business configured on our shared multi-tenant BMS. You can manage orders, customers, product pricing, purchasing and inventory from one workspace. Stock quantities and costs are visible by location, with reservation, issue and return workflows available in the product.” Avoid stating that interactive stock transactions or accounting integrations have been independently verified in this browser session.

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
- Shared production stock database functions passed an isolated fictional transaction: goods receipt 30 packs at £24, reserve 12, partial release 5, issue 4, return 2, then reconcile on-hand 28, reserved 3 and FIFO cost layers 28. The entire test was rolled back, so no live tenant data was changed.
- Server-side demo stock storage table accepted an isolated INSERT/UPDATE/SELECT test inside a rolled-back transaction.
- Fictional stock products and costs now use the same shared demo catalogue as Price Book and Purchasing.

## Browser test access investigation

The connected Vercel fetch capability only supports URL-based GET and does not accept POST bodies, custom headers or persistent browser cookies. It is not an authenticated interactive browser, so it cannot run the stock UI workflow or prove persistence across browser requests. The demo stock endpoint itself is intentionally session-cookie scoped, and the live tenant endpoint additionally requires a valid membership token. No security controls should be weakened to accommodate a read-only tool. The read-only recording can proceed immediately.

## Not yet verified, so do not demonstrate as completed

- Reserve → partial release → issue → return through the actual browser. The shared database logic passed a fictional SQL transaction, but browser/API POST and cross-request persistence have not been tested.
- The actual Goods Received interactive UI posting to stock, allocations and financial costing in the demo. Shared receipt/movement and FIFO costing functions passed an isolated fictional database test only.
- Stripe paid-seat reduction safeguards.
- All tenant-wide terminology surfaces.

Do not imply the demo is fully production-ready or that the fictional demo performs real financial transactions.
