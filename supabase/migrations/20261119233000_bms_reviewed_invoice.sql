BEGIN;
CREATE TABLE public.business_software_invoice_reviews(
 invoice_id uuid PRIMARY KEY REFERENCES public.business_software_invoices(id), tenant_id uuid NOT NULL REFERENCES public.business_software_tenants(id),
 quote_id uuid NOT NULL REFERENCES public.business_software_quotes(id), quote_snapshot jsonb NOT NULL, amount_basis text NOT NULL CHECK(amount_basis IN ('excluding_vat','including_vat')),
 net numeric(14,2) NOT NULL CHECK(net>0), vat numeric(14,2) NOT NULL CHECK(vat>=0), gross numeric(14,2) NOT NULL CHECK(gross=net+vat),
 reviewed_by uuid NOT NULL, request_key text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,quote_id),UNIQUE(tenant_id,request_key)
);
ALTER TABLE public.business_software_invoice_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_software_invoice_reviews FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.business_software_invoice_reviews TO service_role;
CREATE OR REPLACE FUNCTION public.bms_create_reviewed_invoice(p_tenant uuid,p_quote uuid,p_expected jsonb,p_basis text,p_confirmed_gross numeric,p_reviewer uuid,p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q record;j record;prior record;snapshot jsonb;n numeric;v numeric;g numeric;invoice uuid;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN RAISE EXCEPTION 'Service role required';END IF;
 PERFORM 1 FROM business_software_tenants WHERE id=p_tenant AND status='active' AND data_backend='central' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active central account required';END IF;
 PERFORM 1 FROM business_software_users WHERE tenant_id=p_tenant AND auth_user_id=p_reviewer AND status='active' AND role IN ('owner','admin','manager') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active invoice manager required';END IF;
 IF p_key IS NULL OR p_key!~'^[a-zA-Z0-9:_-]{8,150}$' OR p_expected IS NULL OR p_basis IS NULL OR p_basis NOT IN ('excluding_vat','including_vat') THEN RAISE EXCEPTION 'Complete invoice review required';END IF;
 SELECT * INTO q FROM business_software_quotes WHERE id=p_quote AND tenant_id=p_tenant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found';END IF;
 SELECT * INTO j FROM business_software_jobs WHERE id=q.job_id AND tenant_id=p_tenant FOR UPDATE;
 IF NOT FOUND OR j.customer_id IS NULL OR NOT EXISTS(SELECT 1 FROM business_software_customers WHERE id=j.customer_id AND tenant_id=p_tenant) THEN RAISE EXCEPTION 'Customer-linked job required';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||':reviewed_invoice:'||j.id::text,0));
 SELECT * INTO prior FROM business_software_invoice_reviews WHERE tenant_id=p_tenant AND (quote_id=p_quote OR request_key=p_key) FOR UPDATE;
 IF FOUND THEN
  IF prior.quote_id<>p_quote OR prior.request_key<>p_key OR prior.quote_snapshot<>p_expected OR prior.amount_basis<>p_basis OR prior.reviewed_by<>p_reviewer OR prior.gross IS DISTINCT FROM p_confirmed_gross THEN RAISE EXCEPTION 'Invoice already reviewed or retry changed';END IF;
  RETURN jsonb_build_object('invoice_id',prior.invoice_id,'created',false);
 END IF;
 IF EXISTS(SELECT 1 FROM business_software_invoices WHERE tenant_id=p_tenant AND job_id=j.id) THEN RAISE EXCEPTION 'Existing invoice requires review; no replacement created';END IF;
 IF lower(coalesce(q.status,''))<>'approved' OR q.id IS DISTINCT FROM(SELECT id FROM business_software_quotes WHERE tenant_id=p_tenant AND job_id=j.id ORDER BY version DESC,created_at DESC LIMIT 1) THEN RAISE EXCEPTION 'Latest approved saved quote required';END IF;
 snapshot:=jsonb_build_object('id',q.id,'job_id',q.job_id,'version',q.version,'amount',q.amount,'vat_rate',q.vat_rate,'scope_text',q.scope_text,'status',q.status);
 IF snapshot IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Quote changed; reload review';END IF;
 IF q.amount IS NULL OR q.amount<=0 OR q.amount>10000000 OR q.amount<>round(q.amount,2) OR q.vat_rate IS NULL OR q.vat_rate<0 OR q.vat_rate>100 OR q.vat_rate<>round(q.vat_rate,6) THEN RAISE EXCEPTION 'Valid quote amount and VAT rate required';END IF;
 IF p_basis='excluding_vat' THEN n:=q.amount;v:=round(n*q.vat_rate/100,2);g:=n+v;ELSE g:=q.amount;n:=round(g/(1+q.vat_rate/100),2);v:=g-n;END IF;
 IF g>10000000 OR p_confirmed_gross IS DISTINCT FROM g THEN RAISE EXCEPTION 'Confirm exact reviewed grand total';END IF;
 INSERT INTO business_software_invoices(tenant_id,job_id,provider,external_invoice_id,invoice_number,status,total,amount_due,amount_paid,amount_credited,currency_code,invoice_date,created_by,source_quote_id)
 VALUES(p_tenant,j.id,'bms','bms-'||j.id,j.reference,'DRAFT',g,g,0,0,'GBP',CURRENT_DATE,p_reviewer::text,q.id) RETURNING id INTO invoice;
 INSERT INTO business_software_invoice_reviews(invoice_id,tenant_id,quote_id,quote_snapshot,amount_basis,net,vat,gross,reviewed_by,request_key) VALUES(invoice,p_tenant,q.id,snapshot,p_basis,n,v,g,p_reviewer,p_key);
 RETURN jsonb_build_object('invoice_id',invoice,'created',true);
END $$;
REVOKE ALL ON FUNCTION public.bms_create_reviewed_invoice(uuid,uuid,jsonb,text,numeric,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_create_reviewed_invoice(uuid,uuid,jsonb,text,numeric,uuid,text) TO service_role;
COMMIT;
