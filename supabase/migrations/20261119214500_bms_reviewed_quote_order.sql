-- Explicitly reviewed product mapping. No narrative parsing or price-book repricing.
BEGIN;
CREATE TABLE public.business_software_quote_order_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.business_software_tenants(id),
 quote_id uuid NOT NULL,
 sales_order_id uuid NOT NULL,
 quote_snapshot jsonb NOT NULL,
 reviewed_lines jsonb NOT NULL,
 amount_basis text NOT NULL CHECK(amount_basis IN ('excluding_vat','including_vat')),
 reviewed_by uuid NOT NULL,
 request_key text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,quote_id), UNIQUE(tenant_id,request_key), UNIQUE(tenant_id,sales_order_id)
);
ALTER TABLE public.business_software_quote_order_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_software_quote_order_reviews FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.business_software_quote_order_reviews TO service_role;
CREATE OR REPLACE FUNCTION public.bms_create_reviewed_quote_order(p_tenant uuid,p_quote uuid,p_expected jsonb,p_lines jsonb,p_amount_basis text,p_reviewer uuid,p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
DECLARE q record;j record;previous record;item jsonb;product record;order_id uuid;qty numeric;price numeric;total numeric:=0;seen uuid[]:='{}';product_id uuid;snapshot jsonb;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN RAISE EXCEPTION 'Service role required';END IF;
 IF NOT EXISTS(SELECT 1 FROM business_software_tenants WHERE id=p_tenant AND status='active' AND data_backend='central') THEN RAISE EXCEPTION 'Active central account required';END IF;
 IF p_key IS NULL OR p_key!~'^[a-zA-Z0-9:_-]{8,150}$' OR p_reviewer IS NULL THEN RAISE EXCEPTION 'Reviewer and unique request key required';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||':reviewed_quote:'||p_quote::text,0));
 SELECT * INTO previous FROM business_software_quote_order_reviews WHERE tenant_id=p_tenant AND (quote_id=p_quote OR request_key=p_key) FOR UPDATE;
 IF FOUND THEN
  IF previous.quote_id<>p_quote OR previous.request_key<>p_key OR previous.reviewed_lines<>p_lines OR previous.amount_basis IS DISTINCT FROM p_amount_basis OR previous.quote_snapshot<>p_expected OR previous.reviewed_by<>p_reviewer THEN RAISE EXCEPTION 'Quote already mapped or request details changed';END IF;
  RETURN jsonb_build_object('order_id',previous.sales_order_id,'created',false);
 END IF;
 SELECT * INTO q FROM business_software_quotes WHERE id=p_quote AND tenant_id=p_tenant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found';END IF;
 SELECT * INTO j FROM business_software_jobs WHERE id=q.job_id AND tenant_id=p_tenant FOR UPDATE;
 IF NOT FOUND OR j.customer_id IS NULL OR NOT EXISTS(SELECT 1 FROM business_software_customers WHERE id=j.customer_id AND tenant_id=p_tenant) THEN RAISE EXCEPTION 'Quote job and customer must belong to this account';END IF;
 IF lower(coalesce(q.status,'')) IN ('cancelled','rejected','declined','void') THEN RAISE EXCEPTION 'This quote cannot be mapped';END IF;
 snapshot:=jsonb_build_object('id',q.id,'job_id',q.job_id,'version',q.version,'amount',q.amount,'vat_rate',q.vat_rate,'scope_text',q.scope_text,'status',q.status);
 IF p_expected IS DISTINCT FROM snapshot THEN RAISE EXCEPTION 'Quote changed; reload and review again';END IF;
 IF q.amount IS NULL OR q.amount<0 OR q.amount<>round(q.amount,2) THEN RAISE EXCEPTION 'Quote requires a valid two-decimal amount';END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)<1 OR jsonb_array_length(p_lines)>100 THEN RAISE EXCEPTION 'Review 1 to 100 product lines';END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  product_id:=(item->>'product_id')::uuid;qty:=(item->>'quantity')::numeric;price:=(item->>'agreed_unit_net')::numeric;
  IF product_id IS NULL OR product_id=ANY(seen) OR qty IS NULL OR qty<=0 OR qty>1000000 OR qty<>round(qty,4) OR price IS NULL OR price<0 OR price>100000000 OR price<>round(price,6) THEN RAISE EXCEPTION 'Invalid or duplicate reviewed product line';END IF;
  SELECT * INTO product FROM business_software_price_book_items WHERE id=product_id AND tenant_id=p_tenant AND active=true FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active product in this account';END IF;
  seen:=array_append(seen,product_id);total:=total+round(qty*price,2);
 END LOOP;
 IF p_amount_basis NOT IN ('excluding_vat','including_vat') OR p_amount_basis IS NULL OR q.vat_rate IS NULL OR q.vat_rate<0 OR q.vat_rate>100 THEN RAISE EXCEPTION 'Choose the saved quote VAT amount basis and verify its VAT rate';END IF;
 IF (p_amount_basis='excluding_vat' AND total<>q.amount) OR (p_amount_basis='including_vat' AND round(total*(1+q.vat_rate/100),2)<>q.amount) THEN RAISE EXCEPTION 'Reviewed prices do not reconcile with saved quote amount and chosen VAT basis';END IF;
 INSERT INTO business_software_sales_orders(tenant_id,customer_id,job_id,reference) VALUES(p_tenant,j.customer_id,j.id,'Quote '||j.reference||' v'||q.version) RETURNING id INTO order_id;
 FOR item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  SELECT * INTO product FROM business_software_price_book_items WHERE id=(item->>'product_id')::uuid AND tenant_id=p_tenant AND active=true FOR SHARE;
  INSERT INTO business_software_sales_order_lines(tenant_id,sales_order_id,product_id,description,quantity,unit,agreed_unit_net)
  VALUES(p_tenant,order_id,product.id,product.name,(item->>'quantity')::numeric,coalesce(product.unit,'each'),(item->>'agreed_unit_net')::numeric);
 END LOOP;
 INSERT INTO business_software_quote_order_reviews(tenant_id,quote_id,sales_order_id,quote_snapshot,reviewed_lines,amount_basis,reviewed_by,request_key) VALUES(p_tenant,p_quote,order_id,snapshot,p_lines,p_amount_basis,p_reviewer,p_key);
 RETURN jsonb_build_object('order_id',order_id,'created',true);
END $function$;
REVOKE ALL ON FUNCTION public.bms_create_reviewed_quote_order(uuid,uuid,jsonb,jsonb,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_create_reviewed_quote_order(uuid,uuid,jsonb,jsonb,text,uuid,text) TO service_role;
COMMIT;
