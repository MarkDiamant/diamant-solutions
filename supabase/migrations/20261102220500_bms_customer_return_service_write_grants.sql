-- Explicit service-only write privileges for customer return records.
grant select,insert,update,delete on public.business_software_customer_returns to service_role;
revoke all on public.business_software_customer_returns from anon,authenticated;
