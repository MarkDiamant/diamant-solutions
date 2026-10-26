-- Stable request keys prevent duplicate delivery/fitting plans after network retries.
ALTER TABLE public.business_software_deliveries ADD COLUMN IF NOT EXISTS request_key text;
ALTER TABLE public.business_software_fitting_assignments ADD COLUMN IF NOT EXISTS request_key text;
CREATE UNIQUE INDEX IF NOT EXISTS bms_delivery_request_key_unique ON public.business_software_deliveries(tenant_id,request_key) WHERE request_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bms_fitting_request_key_unique ON public.business_software_fitting_assignments(tenant_id,request_key) WHERE request_key IS NOT NULL;
