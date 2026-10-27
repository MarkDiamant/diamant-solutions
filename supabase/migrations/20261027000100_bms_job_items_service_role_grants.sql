-- Restore access for the trusted BMS service-role API only.
-- The tables were created without DML grants, causing PostgREST 42501 on job-item reads.
-- Tenant identity and job ownership are verified in the BMS API before each query.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.business_software_job_items TO service_role;
GRANT SELECT, INSERT ON TABLE public.business_software_job_item_revisions TO service_role;
