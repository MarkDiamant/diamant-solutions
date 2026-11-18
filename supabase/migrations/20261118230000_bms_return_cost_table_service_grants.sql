-- Return-cost side tables are written by the server-side receiving and customer-return functions
-- (bms_record_customer_return_once and friends run SECURITY INVOKER, so the caller's grants apply).
-- The sibling tables in the same migration family received explicit service_role grants, but
-- business_software_inventory_cost_allocations and business_software_customer_return_cost_sources
-- were missed, which makes every customer return fail with a permission error.
-- Restrict access to the trusted service role; never expose to anon/authenticated.
grant select,insert,update,delete on public.business_software_inventory_cost_allocations to service_role;
revoke all on public.business_software_inventory_cost_allocations from anon,authenticated;
grant select,insert,update,delete on public.business_software_customer_return_cost_sources to service_role;
revoke all on public.business_software_customer_return_cost_sources from anon,authenticated;
