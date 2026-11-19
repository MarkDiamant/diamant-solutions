# Permission payload tests

Server-side proof that BMS API payloads honor the permission classes defined in
`business-software-core/lib/permissions.ts`:

- pricing (sell prices, quotes): `view_pricing`
- costing (costs, margins, markups, profit): `view_costs_profit`
- financial (payments, invoices, payment method): `view_payments_invoices` or `view_money_overview`

`payload-tests.py` is driven by a harness wrapper that can (a) mint user
tokens and (b) set the test user's explicit permission array per case. It was
run against an isolated Supabase project + `next start` harness on 2026-11-19
(12/12 pass) alongside a 4-role x 56-endpoint status matrix (224/224 unchanged
vs pre-patch) and per-role UI screenshot review.

The tests deliberately use a non-zero fixture (job quoted 1250, price-book
item with cost and sell set) so a "field absent" assertion cannot pass
vacuously on empty data, and match on key paths rather than substrings so the
pricing-method value "margin" does not false-positive.
