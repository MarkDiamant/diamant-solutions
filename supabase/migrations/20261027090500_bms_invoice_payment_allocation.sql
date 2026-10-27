CREATE TABLE IF NOT EXISTS public.business_software_invoice_payment_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES public.business_software_tenants(id),job_id uuid NOT NULL REFERENCES public.business_software_jobs(id),invoice_id uuid NOT NULL REFERENCES public.business_software_invoices(id),payment_id uuid NOT NULL UNIQUE REFERENCES public.business_software_payments(id),request_key text NOT NULL,amount numeric(14,2) NOT NULL CHECK(amount>0),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,request_key));
CREATE INDEX IF NOT EXISTS bms_invoice_allocations_invoice_idx ON public.business_software_invoice_payment_allocations(tenant_id,job_id,invoice_id);
ALTER TABLE public.business_software_invoice_payment_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_software_invoice_payment_allocations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.business_software_invoice_payment_allocations TO service_role;
CREATE OR REPLACE FUNCTION public.bms_record_internal_invoice_payment_once(p_tenant uuid, p_job uuid, p_invoice uuid, p_amount numeric, p_method text, p_paid_at timestamp with time zone, p_key text, p_actor text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE inv public.business_software_invoices%ROWTYPE; existing public.business_software_invoice_payment_allocations%ROWTYPE; payment uuid; due numeric;
BEGIN
 IF p_tenant IS NULL OR p_job IS NULL OR p_invoice IS NULL OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$' THEN RAISE EXCEPTION 'Invalid payment request'; END IF;
 IF p_amount IS NULL OR p_amount<=0 OR p_amount>10000000 OR p_amount<>round(p_amount,2) THEN RAISE EXCEPTION 'Payment must be positive with penny precision'; END IF;
 IF p_paid_at IS NULL OR p_paid_at>now()+interval '5 minutes' THEN RAISE EXCEPTION 'Payment date must not be in the future'; END IF;
 IF length(trim(coalesce(p_method,'')))<2 OR length(p_method)>80 THEN RAISE EXCEPTION 'Valid payment method required'; END IF;
 SELECT * INTO inv FROM public.business_software_invoices WHERE id=p_invoice AND tenant_id=p_tenant AND job_id=p_job AND provider='internal' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found in tenant and job'; END IF;
 SELECT * INTO existing FROM public.business_software_invoice_payment_allocations WHERE tenant_id=p_tenant AND request_key=p_key;
 IF FOUND THEN
   IF existing.invoice_id<>p_invoice OR existing.job_id<>p_job OR existing.amount<>p_amount THEN RAISE EXCEPTION 'Idempotency key reused with different payment'; END IF;
   RETURN jsonb_build_object('payment_id',existing.payment_id,'invoice_id',p_invoice,'created',false);
 END IF;
 IF inv.status NOT IN ('issued','part_paid') THEN RAISE EXCEPTION 'Only issued invoices can receive payments'; END IF;
 due:=coalesce(inv.amount_due,0);
 IF p_amount>due THEN RAISE EXCEPTION 'Payment exceeds outstanding invoice balance'; END IF;
 INSERT INTO public.business_software_payments(tenant_id,job_id,direction,payment_type,amount,payment_method,paid_at,notes)
 VALUES(p_tenant,p_job,'in','customer',p_amount,left(trim(p_method),80),p_paid_at,'Allocated to internal invoice '||p_invoice::text) RETURNING id INTO payment;
 INSERT INTO public.business_software_invoice_payment_allocations(tenant_id,job_id,invoice_id,payment_id,request_key,amount)
 VALUES(p_tenant,p_job,p_invoice,payment,p_key,p_amount);
 UPDATE public.business_software_invoices SET amount_paid=coalesce(amount_paid,0)+p_amount,amount_due=due-p_amount,status=CASE WHEN due=p_amount THEN 'paid' ELSE 'part_paid' END
 WHERE id=p_invoice AND tenant_id=p_tenant AND job_id=p_job;
 INSERT INTO public.business_software_audit_events(tenant_id,actor,action,entity_type,entity_id,metadata)
 VALUES(p_tenant,left(coalesce(p_actor,'BMS manager'),150),'invoice.payment_recorded','invoice',p_invoice::text,jsonb_build_object('job_id',p_job,'payment_id',payment,'amount',p_amount,'request_key',p_key));
 RETURN jsonb_build_object('payment_id',payment,'invoice_id',p_invoice,'created',true,'remaining',due-p_amount);
END $function$
;
REVOKE ALL ON FUNCTION public.bms_record_internal_invoice_payment_once(uuid,uuid,uuid,numeric,text,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_record_internal_invoice_payment_once(uuid,uuid,uuid,numeric,text,timestamptz,text,text) TO service_role;
