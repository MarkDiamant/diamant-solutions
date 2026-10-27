-- Shared per-tenant/provider manual accounting-sync lease. Metadata only, no financial rows.
CREATE TABLE IF NOT EXISTS public.business_software_accounting_sync_leases (
 tenant_id uuid NOT NULL REFERENCES public.business_software_tenants(id) ON DELETE CASCADE,
 provider text NOT NULL CHECK (provider IN ('xero','quickbooks')),
 request_key text NOT NULL,
 lease_until timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,provider)
);
ALTER TABLE public.business_software_accounting_sync_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_software_accounting_sync_leases FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.business_software_accounting_sync_leases TO service_role;
CREATE OR REPLACE FUNCTION public.bms_claim_accounting_sync(p_tenant uuid,p_provider text,p_key text,p_seconds int DEFAULT 180)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE acquired boolean:=false;
BEGIN
 IF p_tenant IS NULL OR p_provider NOT IN ('xero','quickbooks') OR p_key IS NULL OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$' OR p_seconds NOT BETWEEN 60 AND 1800 THEN
  RAISE EXCEPTION 'Invalid sync lease request';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.business_software_tenants WHERE id=p_tenant AND status='active') THEN RAISE EXCEPTION 'Tenant is not active';END IF;
 INSERT INTO public.business_software_accounting_sync_leases(tenant_id,provider,request_key,lease_until,updated_at)
 VALUES(p_tenant,p_provider,p_key,now()+make_interval(secs=>p_seconds),now())
 ON CONFLICT(tenant_id,provider) DO UPDATE
 SET request_key=EXCLUDED.request_key,lease_until=EXCLUDED.lease_until,updated_at=now()
 WHERE public.business_software_accounting_sync_leases.lease_until<=now()
 RETURNING true INTO acquired;
 RETURN coalesce(acquired,false);
END $$;
REVOKE ALL ON FUNCTION public.bms_claim_accounting_sync(uuid,text,text,int) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_claim_accounting_sync(uuid,text,text,int) TO service_role;
