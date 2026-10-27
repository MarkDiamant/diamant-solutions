CREATE OR REPLACE FUNCTION public.bms_approve_quote_once(p_tenant uuid, p_job uuid, p_quote uuid, p_actor text, p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE q public.business_software_quotes%ROWTYPE; latest uuid;
BEGIN
 IF p_tenant IS NULL OR p_job IS NULL OR p_quote IS NULL OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$' THEN RAISE EXCEPTION 'Invalid quotation approval'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||p_job::text,88227));
 SELECT id INTO latest FROM public.business_software_quotes WHERE tenant_id=p_tenant AND job_id=p_job ORDER BY version DESC LIMIT 1;
 IF latest IS DISTINCT FROM p_quote THEN RAISE EXCEPTION 'Only latest quotation revision can be approved'; END IF;
 SELECT * INTO q FROM public.business_software_quotes WHERE tenant_id=p_tenant AND job_id=p_job AND id=p_quote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found in tenant'; END IF;
 IF q.status='approved' THEN RETURN jsonb_build_object('id',q.id,'status',q.status,'created',false); END IF;
 IF q.status<>'draft' OR q.amount<=0 OR q.vat_rate<0 OR q.vat_rate>100 THEN RAISE EXCEPTION 'Quotation cannot be approved'; END IF;
 UPDATE public.business_software_quotes SET status='approved' WHERE id=q.id AND tenant_id=p_tenant AND job_id=p_job AND status='draft';
 INSERT INTO public.business_software_audit_events(tenant_id,actor,action,entity_type,entity_id,metadata)
 VALUES(p_tenant,left(coalesce(p_actor,'BMS manager'),150),'quote.approved','quotation',q.id::text,jsonb_build_object('job_id',p_job,'version',q.version,'request_key',p_key));
 RETURN jsonb_build_object('id',q.id,'status','approved','created',true);
END $function$
;
REVOKE ALL ON FUNCTION public.bms_approve_quote_once(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_approve_quote_once(uuid,uuid,uuid,text,text) TO service_role;
