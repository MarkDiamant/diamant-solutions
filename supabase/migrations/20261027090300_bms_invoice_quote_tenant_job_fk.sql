-- Prevent invoice source quotations from belonging to a different tenant or job.
-- Existing invoice and quotation rows are not modified.
ALTER TABLE public.business_software_quotes ADD CONSTRAINT bms_quote_tenant_job_id_unique UNIQUE(tenant_id,job_id,id);
ALTER TABLE public.business_software_invoices ADD CONSTRAINT bms_invoice_quote_same_tenant_job_fk FOREIGN KEY(tenant_id,job_id,source_quote_id) REFERENCES public.business_software_quotes(tenant_id,job_id,id) NOT VALID;
ALTER TABLE public.business_software_invoices VALIDATE CONSTRAINT bms_invoice_quote_same_tenant_job_fk;
