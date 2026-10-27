-- Shared BMS: server-derived, tenant-scoped, retry-safe internal draft invoices.
ALTER TABLE public.business_software_invoices ADD COLUMN IF NOT EXISTS request_key text;
CREATE UNIQUE INDEX IF NOT EXISTS business_software_invoices_tenant_request_key_uniq
 ON public.business_software_invoices(tenant_id,request_key) WHERE request_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.bms_create_internal_draft_invoice_once(
 p_tenant uuid,p_job uuid,p_quote uuid,p_key text,p_invoice_prefix text DEFAULT 'INV')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q business_software_quotes%ROWTYPE;prior business_software_invoices%ROWTYPE;saved business_software_invoices%ROWTYPE;gross numeric;number text;
BEGIN
 IF p_tenant IS NULL OR p_job IS NULL OR p_quote IS NULL OR p_key IS NULL
 OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$'
 OR p_invoice_prefix IS NULL OR p_invoice_prefix !~ '^[A-Za-z0-9-]{2,12}$'
 THEN RAISE EXCEPTION 'Invalid internal draft invoice request'; END IF;
 SELECT * INTO q FROM public.business_software_quotes WHERE id=p_quote AND tenant_id=p_tenant AND job_id=p_job;
 IF NOT FOUND THEN RAISE EXCEPTION 'Quotation outside tenant or job'; END IF;
 IF q.amount<=0 OR q.vat_rate<0 OR q.vat_rate>100 THEN RAISE EXCEPTION 'Invalid quotation total'; END IF;
 gross:=round(q.amount*(1+q.vat_rate/100),2);
 IF gross<=0 OR gross>10000000 THEN RAISE EXCEPTION 'Invalid invoice total'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||p_key,90918));
 SELECT * INTO prior FROM public.business_software_invoices WHERE tenant_id=p_tenant AND request_key=p_key LIMIT 1;
 IF FOUND THEN
  IF prior.job_id<>p_job OR prior.total<>gross OR prior.provider<>'internal' THEN
   RAISE EXCEPTION 'Invoice request key reused for different source';
  END IF;
  RETURN jsonb_build_object('id',prior.id,'invoice_number',prior.invoice_number,'total',prior.total,'created',false);
 END IF;
 number:=p_invoice_prefix||'-'||upper(substr(md5(p_tenant::text||':'||p_key),1,16));
 INSERT INTO public.business_software_invoices(tenant_id,job_id,provider,invoice_number,status,total,amount_due,amount_paid,currency_code,created_by,request_key)
 VALUES(p_tenant,p_job,'internal',number,'draft',gross,gross,0,'GBP','BMS internal draft',p_key)
 RETURNING * INTO saved;
 RETURN jsonb_build_object('id',saved.id,'invoice_number',saved.invoice_number,'total',saved.total,'created',true);
END $$;
REVOKE ALL ON FUNCTION public.bms_create_internal_draft_invoice_once(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_create_internal_draft_invoice_once(uuid,uuid,uuid,text,text) TO service_role;