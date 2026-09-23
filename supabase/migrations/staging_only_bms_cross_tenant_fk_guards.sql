-- Staging-only: prevent cross-tenant references even from privileged server writes.
-- Existing single-column FKs remain; composite FKs also enforce matching tenant_id.
ALTER TABLE public.business_software_customers ADD CONSTRAINT bms_customers_tenant_id_id_unique UNIQUE (tenant_id,id);
ALTER TABLE public.business_software_jobs ADD CONSTRAINT bms_jobs_tenant_id_id_unique UNIQUE (tenant_id,id);
ALTER TABLE public.business_software_people ADD CONSTRAINT bms_people_tenant_id_id_unique UNIQUE (tenant_id,id);
ALTER TABLE public.business_software_suppliers ADD CONSTRAINT bms_suppliers_tenant_id_id_unique UNIQUE (tenant_id,id);
ALTER TABLE public.business_software_jobs ADD CONSTRAINT bms_jobs_customer_id_same_tenant FOREIGN KEY (tenant_id,customer_id) REFERENCES public.business_software_customers(tenant_id,id);
ALTER TABLE public.business_software_activities ADD CONSTRAINT bms_activities_job_id_same_tenant FOREIGN KEY (tenant_id,job_id) REFERENCES public.business_software_jobs(tenant_id,id);
ALTER TABLE public.business_software_files ADD CONSTRAINT bms_files_job_id_same_tenant FOREIGN KEY (tenant_id,job_id) REFERENCES public.business_software_jobs(tenant_id,id);
ALTER TABLE public.business_software_integration_events ADD CONSTRAINT bms_integration_events_job_id_same_tenant FOREIGN KEY (tenant_id,job_id) REFERENCES public.business_software_jobs(tenant_id,id);
ALTER TABLE public.business_software_invoices ADD CONSTRAINT bms_invoices_job_id_same_tenant FOREIGN KEY (tenant_id,job_id) REFERENCES public.business_software_jobs(tenant_id,id);
ALTER TABLE public.business_software_job_costs ADD CONSTRAINT bms_job_costs_job_id_same_tenant FOREIGN KEY (tenant_id,job_id) REFERENCES public.business_software_jobs(tenant_id,id);
ALTER TABLE public.business_software_job_people ADD CONSTRAINT bms_job_people_job_id_same_tenant FOREIGN KEY (tenant_id,job_id) REFERENCES public.business_software_jobs(tenant_id,id);
ALTER TABLE public.business_software_job_people ADD CONSTRAINT bms_job_people_person_id_same_tenant FOREIGN KEY (tenant_id,person_id) REFERENCES public.business_software_people(tenant_id,id);
ALTER TABLE public.business_software_material_orders ADD CONSTRAINT bms_material_orders_job_id_same_tenant FOREIGN KEY (tenant_id,job_id) REFERENCES public.business_software_jobs(tenant_id,id);
ALTER TABLE public.business_software_material_orders ADD CONSTRAINT bms_material_orders_supplier_id_same_tenant FOREIGN KEY (tenant_id,supplier_id) REFERENCES public.business_software_suppliers(tenant_id,id);
ALTER TABLE public.business_software_payments ADD CONSTRAINT bms_payments_job_id_same_tenant FOREIGN KEY (tenant_id,job_id) REFERENCES public.business_software_jobs(tenant_id,id);
ALTER TABLE public.business_software_quotes ADD CONSTRAINT bms_quotes_job_id_same_tenant FOREIGN KEY (tenant_id,job_id) REFERENCES public.business_software_jobs(tenant_id,id);
