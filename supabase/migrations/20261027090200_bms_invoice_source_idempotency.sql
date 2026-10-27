CREATE OR REPLACE FUNCTION public.bms_create_internal_draft_invoice_once(p_tenant uuid, p_job uuid, p_quote uuid, p_key text, p_invoice_prefix text DEFAULT 'INV'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF prior.job_id<>p_job OR prior.total<>gross OR prior.provider<>'internal' OR prior.source_quote_id IS DISTINCT FROM p_quote THEN
   RAISE EXCEPTION 'Invoice request key reused for different source';
  END IF;
  RETURN jsonb_build_object('id',prior.id,'invoice_number',prior.invoice_number,'total',prior.total,'created',false);
 END IF;
 SELECT * INTO prior FROM public.business_software_invoices
 WHERE tenant_id=p_tenant AND job_id=p_job AND source_quote_id=p_quote AND provider='internal' AND status='draft' ORDER BY created_at ASC LIMIT 1;
 IF FOUND THEN
  IF prior.total<>gross THEN RAISE EXCEPTION 'Existing draft invoice does not match approved quotation'; END IF;
  RETURN jsonb_build_object('id',prior.id,'invoice_number',prior.invoice_number,'total',prior.total,'created',false);
 END IF;
 number:=p_invoice_prefix||'-'||upper(substr(md5(p_tenant::text||':'||p_key),1,16));
 INSERT INTO public.business_software_invoices(tenant_id,job_id,provider,invoice_number,status,total,amount_due,amount_paid,currency_code,created_by,request_key,source_quote_id)
 VALUES(p_tenant,p_job,'internal',number,'draft',gross,gross,0,'GBP','BMS internal draft',p_key,p_quote)
 RETURNING * INTO saved;
 RETURN jsonb_build_object('id',saved.id,'invoice_number',saved.invoice_number,'total',saved.total,'created',true);
END $function$
;
REVOKE ALL ON FUNCTION public.bms_create_internal_draft_invoice_once(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_create_internal_draft_invoice_once(uuid,uuid,uuid,text,text) TO service_role;
