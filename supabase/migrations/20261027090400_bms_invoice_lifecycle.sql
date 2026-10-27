CREATE OR REPLACE FUNCTION public.bms_transition_internal_invoice_once(p_tenant uuid, p_job uuid, p_invoice uuid, p_action text, p_actor text, p_key text, p_due_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE inv public.business_software_invoices%ROWTYPE; target text;
BEGIN
 IF p_tenant IS NULL OR p_job IS NULL OR p_invoice IS NULL OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$' THEN RAISE EXCEPTION 'Invalid invoice transition'; END IF;
 IF p_action NOT IN ('issue','void') THEN RAISE EXCEPTION 'Unsupported invoice transition'; END IF;
 SELECT * INTO inv FROM public.business_software_invoices WHERE tenant_id=p_tenant AND job_id=p_job AND id=p_invoice AND provider='internal' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Internal invoice not found in tenant and job'; END IF;
 target:=CASE WHEN p_action='issue' THEN 'issued' ELSE 'void' END;
 IF inv.status=target THEN RETURN jsonb_build_object('id',inv.id,'status',target,'created',false); END IF;
 IF p_action='issue' THEN
   IF inv.status<>'draft' OR inv.total IS NULL OR inv.total<=0 OR inv.amount_paid<>0 OR inv.amount_due<>inv.total THEN RAISE EXCEPTION 'Only unpaid valid drafts can be issued'; END IF;
   IF p_due_date IS NULL OR p_due_date<CURRENT_DATE THEN RAISE EXCEPTION 'Invoice due date must be today or later'; END IF;
   UPDATE public.business_software_invoices SET status='issued',invoice_date=CURRENT_DATE,due_date=p_due_date WHERE id=inv.id AND tenant_id=p_tenant AND job_id=p_job;
 ELSE
   IF inv.status NOT IN ('draft','issued') OR (coalesce(inv.amount_paid,0)<>0 OR coalesce(inv.amount_credited,0)<>0) THEN RAISE EXCEPTION 'Paid invoices cannot be voided'; END IF;
   UPDATE public.business_software_invoices SET status='void',amount_due=0 WHERE id=inv.id AND tenant_id=p_tenant AND job_id=p_job;
 END IF;
 INSERT INTO public.business_software_audit_events(tenant_id,actor,action,entity_type,entity_id,metadata)
 VALUES(p_tenant,left(coalesce(p_actor,'BMS manager'),150),'invoice.'||target,'invoice',inv.id::text,jsonb_build_object('job_id',p_job,'request_key',p_key,'previous_status',inv.status));
 RETURN jsonb_build_object('id',inv.id,'status',target,'created',true);
END $function$
;
REVOKE ALL ON FUNCTION public.bms_transition_internal_invoice_once(uuid,uuid,uuid,text,text,text,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_transition_internal_invoice_once(uuid,uuid,uuid,text,text,text,date) TO service_role;
