ALTER TABLE public.business_software_invoices ADD COLUMN IF NOT EXISTS amount_credited numeric(14,2) NOT NULL DEFAULT 0 CHECK(amount_credited>=0);
CREATE TABLE IF NOT EXISTS public.business_software_invoice_credit_notes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES public.business_software_tenants(id),job_id uuid NOT NULL REFERENCES public.business_software_jobs(id),invoice_id uuid NOT NULL REFERENCES public.business_software_invoices(id),credit_number text NOT NULL,request_key text NOT NULL,amount numeric(14,2) NOT NULL CHECK(amount>0),reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 500),issued_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,credit_number));
ALTER TABLE public.business_software_invoice_credit_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_software_invoice_credit_notes FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.business_software_invoice_credit_notes TO service_role;
ALTER TABLE public.business_software_invoice_credit_notes ADD CONSTRAINT bms_credit_invoice_tenant_job_fk FOREIGN KEY(tenant_id,job_id,invoice_id) REFERENCES public.business_software_invoices(tenant_id,job_id,id) NOT VALID;
ALTER TABLE public.business_software_invoice_credit_notes VALIDATE CONSTRAINT bms_credit_invoice_tenant_job_fk;
CREATE OR REPLACE FUNCTION public.bms_issue_internal_invoice_credit_once(p_tenant uuid, p_job uuid, p_invoice uuid, p_amount numeric, p_reason text, p_key text, p_actor text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE inv public.business_software_invoices%ROWTYPE; existing public.business_software_invoice_credit_notes%ROWTYPE; note uuid; number text; remaining numeric;
BEGIN
 IF p_tenant IS NULL OR p_job IS NULL OR p_invoice IS NULL OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$' THEN RAISE EXCEPTION 'Invalid credit note request'; END IF;
 IF p_amount IS NULL OR p_amount<=0 OR p_amount>10000000 OR p_amount<>round(p_amount,2) THEN RAISE EXCEPTION 'Credit must be positive with penny precision'; END IF;
 IF length(trim(coalesce(p_reason,'')))<3 OR length(p_reason)>500 THEN RAISE EXCEPTION 'Credit reason is required'; END IF;
 SELECT * INTO inv FROM public.business_software_invoices WHERE tenant_id=p_tenant AND job_id=p_job AND id=p_invoice AND provider='internal' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Internal invoice not found in tenant and job'; END IF;
 SELECT * INTO existing FROM public.business_software_invoice_credit_notes WHERE tenant_id=p_tenant AND request_key=p_key;
 IF FOUND THEN
  IF existing.invoice_id<>p_invoice OR existing.job_id<>p_job OR existing.amount<>p_amount OR existing.reason<>trim(p_reason) THEN RAISE EXCEPTION 'Credit idempotency key reused with different details'; END IF;
  RETURN jsonb_build_object('id',existing.id,'credit_number',existing.credit_number,'created',false);
 END IF;
 IF inv.status NOT IN ('issued','part_paid') THEN RAISE EXCEPTION 'Only issued invoices with outstanding balance can be credited'; END IF;
 IF p_amount>coalesce(inv.amount_due,0) THEN RAISE EXCEPTION 'Credit exceeds outstanding invoice balance'; END IF;
 remaining:=inv.amount_due-p_amount;
 number:='CR-'||upper(substr(md5(p_tenant::text||':'||p_key),1,16));
 INSERT INTO public.business_software_invoice_credit_notes(tenant_id,job_id,invoice_id,credit_number,request_key,amount,reason)
 VALUES(p_tenant,p_job,p_invoice,number,p_key,p_amount,trim(p_reason)) RETURNING id INTO note;
 UPDATE public.business_software_invoices SET amount_credited=amount_credited+p_amount,amount_due=remaining,status=CASE WHEN remaining=0 THEN 'settled' WHEN coalesce(amount_paid,0)>0 THEN 'part_paid' ELSE 'issued' END
 WHERE id=p_invoice AND tenant_id=p_tenant AND job_id=p_job;
 INSERT INTO public.business_software_audit_events(tenant_id,actor,action,entity_type,entity_id,metadata)
 VALUES(p_tenant,left(coalesce(p_actor,'BMS manager'),150),'invoice.credit_issued','invoice',p_invoice::text,jsonb_build_object('job_id',p_job,'credit_note_id',note,'credit_number',number,'amount',p_amount,'request_key',p_key));
 RETURN jsonb_build_object('id',note,'credit_number',number,'created',true,'remaining',remaining);
END $function$
;
REVOKE ALL ON FUNCTION public.bms_issue_internal_invoice_credit_once(uuid,uuid,uuid,numeric,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_issue_internal_invoice_credit_once(uuid,uuid,uuid,numeric,text,text,text) TO service_role;
