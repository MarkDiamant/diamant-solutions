-- Ruby workforce rate verification and worker location corrections use server-only access.
GRANT SELECT,INSERT,UPDATE ON TABLE public.business_software_labour_rates TO service_role;
GRANT UPDATE ON TABLE public.business_software_worker_location_checks TO service_role;
