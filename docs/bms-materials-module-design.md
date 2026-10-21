# BMS Materials, Purchasing and Stock: implementation contract

This module is tenant-scoped and industry-neutral. Do not alter existing quotes, invoices, job costing, or current Price Book behaviour until separately tested.

## Data model
- Existing Price Book: one distinct product per size/specification/unit. Product descriptions and SKUs may be optional. Product IDs are canonical; supplier SKUs are not product IDs.
- Supplier options: one product can have several supplier offers, each with its own SKU, HTTPS link, price, VAT and preferred status.
- Material order: linked to an optional job reference. Statuses: draft, ordered, partially received, received, cancelled.
- Material line: separate editable row per product with SKU, description, specification, supplier, HTTPS link, quantity of pieces, unit price net, VAT rate and net/VAT/gross totals. Product dimensions such as 6 m are specifications, not order quantities.
- Inventory movements: immutable events for received, used, moved into stock, returned to supplier, wasted, corrected; never silently overwrite historical purchases.

## Workflow
1. Create a draft order on a job or independently.
2. Search existing Price Book with live autocomplete, matching product names, sizes, descriptions and SKUs. Selecting a product populates its details and preferred supplier; users may override supplier and price. New products can be proposed by Ruby but require confirmation.
3. Add, edit, remove or copy selected draft rows; copy to another job by searching job reference and customer/address, or create a new order.
4. Confirm the order, freezing the supplier, SKU, unit price, VAT and quantity snapshots. Subsequent Price Book changes affect only unconfirmed orders and future orders, not confirmed purchase history.
5. Receive full or partial deliveries. Default used quantity may initially equal received quantity for a simple workflow, but never before receipt. Adjust Usage exposes stock, supplier return and waste. Stock quantities must be derived from movement events, not editable counters.
6. Track historical purchases by product, dates, suppliers, quantity and paid price; calculate job costs from actual usage plus labour and subcontractors. Track estimated, committed, actual and paid amounts separately.

## Security
- Strict tenant isolation on every table and lookup, including referenced product, supplier, job and order IDs.
- RLS enabled with no public access. Expose only authenticated tenant-member operations with fine-grained read/edit permissions; never expose a service-role key to browsers.
- Server-side input validation, transaction-safe status transitions, no negative stock, audit history, idempotent receipts and stock transfers.
- Ruby may prepare draft rows but must never mark an order placed, purchase externally, deduct stock or update historical prices without confirmation.

## Mobile
- One product per row, with responsive stacked cards on narrow screens and table on desktop.
- Searchable product dropdown/autocomplete, supplier selector, compact VAT/net/gross summaries, touch-sized buttons.
- Mobile BMS navigation: collapsible toolbar controlled by chevron adjacent to Ruby, remembers collapsed state and preserves Ruby access. Desktop unchanged.

## Acceptance tests
- Two tenants cannot access each other's products, orders, suppliers, stock or job references.
- 6 metre product x 10 pieces totals 60 metres of specification but quantity 10 pieces.
- A price change does not retroactively change confirmed orders.
- Receiving 6, using 5 and moving 1 to stock balances exactly; waste and supplier return paths likewise.
- Duplicate confirmation/retry cannot double receive or double count stock.
- Ruby drafts require user confirmation.
- Existing BMS job, quote, invoice, Price Book and Xero workflows are unchanged.
