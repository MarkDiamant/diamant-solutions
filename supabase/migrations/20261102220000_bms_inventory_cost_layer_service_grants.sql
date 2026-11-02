-- Internal stock cost layers are written by the server-side receiving and FIFO functions.
-- Restrict access to the trusted service role; never expose to anon/authenticated.
grant select,insert,update,delete on public.business_software_inventory_cost_layers to service_role;
revoke all on public.business_software_inventory_cost_layers from anon,authenticated;
