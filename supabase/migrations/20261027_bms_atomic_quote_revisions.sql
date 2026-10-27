-- Shared BMS: atomic, tenant-scoped, idempotent quotation revisions.
ALTER TABLE public.business_software_quotes ADD COLUMN IF NOT EXISTS request_key text;
CREATE UNIQUE INDEX IF NOT EXISTS business_software_quotes_tenant_request_key_uniq
ON public.business_software_quotes(tenant_id,request_key) WHERE request_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.bms_create_quote_revision_once(
 p_tenant uuid,p_job uuid,p_scope text,p_amount numeric,p_vat_rate numeric,
 p_lead_time text,p_key text,p_actor text DEFAULT 'BMS manager')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prior business_software_quotes%ROWTYPE; revision int; saved business_software_quotes%ROWTYPE;
BEGIN
 IF p_tenant IS NULL OR p_job IS NULL OR p_scope IS NULL OR length(trim(p_scope)) NOT BETWEEN 3 AND 2000
 OR p_amount IS NULL OR p_amount<=0 OR p_amount>10000000
 OR p_vat_rate IS NULL OR p_vat_rate<0 OR p_vat_rate>100
 OR p_key IS NULL OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$'
 OR length(coalesce(p_lead_time,''))>200 THEN RAISE EXCEPTION 'Invalid quotation revision'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.business_software_jobs WHERE id=p_job AND tenant_id=p_tenant) THEN
  RAISE EXCEPTION 'Quotation job is outside tenant';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||p_job::text,90211));
 SELECT * INTO prior FROM public.business_software_quotes WHERE tenant_id=p_tenant AND request_key=p_key LIMIT 1;
 IF FOUND THEN
  IF prior.job_id<>p_job OR prior.scope_text<>trim(p_scope) OR prior.amount<>p_amount OR prior.vat_rate<>p_vat_rate
   THEN RAISE EXCEPTION 'Request key reused with different quotation'; END IF;
  RETURN jsonb_build_object('id',prior.id,'version',prior.version,'created',false);
 END IF;
 SELECT coalesce(max(version),0)+1 INTO revision FROM public.business_software_quotes WHERE tenant_id=p_tenant AND job_id=p_job;
 INSERT INTO public.business_software_quotes(tenant_id,job_id,version,status,scope_text,amount,vat_rate,lead_time,created_by,request_key)
 VALUES(p_tenant,p_job,revision,'draft',trim(p_scope),p_amount,p_vat_rate,p_lead_time,left(coalesce(p_actor,'BMS manager'),100),p_key)
 RETURNING * INTO saved;
 RETURN jsonb_build_object('id',saved.id,'version',saved.version,'created',true);
END $$;
REVOKE ALL ON FUNCTION public.bms_create_quote_revision_once(uuid,uuid,text,numeric,numeric,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_create_quote_revision_once(uuid,uuid,text,numeric,numeric,text,text,text) TO service_role;