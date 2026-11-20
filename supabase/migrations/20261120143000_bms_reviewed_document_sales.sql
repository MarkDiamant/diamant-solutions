-- Explicitly reviewed customer-order document. No reservations, stock, invoice,
-- payment, quote acceptance or external communication is created here.
CREATE OR REPLACE FUNCTION public.bms_create_reviewed_document_sales(p_tenant uuid,p_member uuid,p_attachment uuid,p_customer uuid,p_job uuid,p_lines jsonb,p_expected_customer jsonb,p_expected_job jsonb,p_reference text,p_total_net numeric)
RETURNS uuid LANGUAGE plpgsql SET search_path TO public AS $$
DECLARE stable_key text; fingerprint text; prior record; customer record; job record; item jsonb; product record; total numeric:=0; result uuid; qty numeric; price numeric;
BEGIN
 PERFORM 1 FROM business_software_tenants WHERE id=p_tenant AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active tenant required'; END IF;
 PERFORM 1 FROM business_software_users WHERE id=p_member AND tenant_id=p_tenant AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active reviewer required'; END IF;
 PERFORM 1 FROM business_software_ai_attachments WHERE id=p_attachment AND tenant_id=p_tenant AND user_id=p_member FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Owned customer document required'; END IF;
 stable_key:='ruby-sales-'||p_attachment::text;
 fingerprint:=md5(jsonb_build_object('member',p_member,'customer',p_customer,'job',p_job,'lines',p_lines,'customer_snapshot',p_expected_customer,'job_snapshot',p_expected_job,'reference',p_reference,'total_net',p_total_net)::text);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||':sales:'||stable_key,0));
 SELECT * INTO prior FROM business_software_order_request_keys WHERE tenant_id=p_tenant AND order_kind='sales' AND request_key=stable_key FOR UPDATE;
 IF FOUND THEN
  IF prior.payload_hash IS DISTINCT FROM fingerprint THEN RAISE EXCEPTION 'This document already has a different reviewed customer draft'; END IF;
  RETURN prior.order_id;
 END IF;
 SELECT id,first_name,last_name INTO customer FROM business_software_customers WHERE id=p_customer AND tenant_id=p_tenant FOR SHARE;
 IF NOT FOUND OR p_expected_customer IS DISTINCT FROM jsonb_build_object('id',customer.id,'first_name',customer.first_name,'last_name',customer.last_name) THEN RAISE EXCEPTION 'Customer changed. Reload and review'; END IF;
 IF p_job IS NOT NULL THEN
  SELECT id,reference,customer_id,status INTO job FROM business_software_jobs WHERE id=p_job AND tenant_id=p_tenant AND customer_id=p_customer FOR SHARE;
  IF NOT FOUND OR p_expected_job IS DISTINCT FROM jsonb_build_object('id',job.id,'reference',job.reference,'customer_id',job.customer_id,'status',job.status) OR lower(coalesce(job.status,'')) IN ('cancelled','lost','archived') THEN RAISE EXCEPTION 'Job changed or does not belong to this customer'; END IF;
 ELSIF p_expected_job IS NOT NULL AND p_expected_job<>'null'::jsonb THEN RAISE EXCEPTION 'Unexpected job snapshot'; END IF;
 IF p_reference IS NULL OR length(p_reference)>120 OR p_total_net IS NULL OR p_total_net<0 OR p_total_net>100000000 OR p_total_net<>round(p_total_net,2) THEN RAISE EXCEPTION 'Review reference and net total'; END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)<1 OR jsonb_array_length(p_lines)>100 OR (SELECT count(DISTINCT value->>'product_id') FROM jsonb_array_elements(p_lines))<>jsonb_array_length(p_lines) THEN RAISE EXCEPTION 'Review 1 to 100 distinct products'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  IF coalesce(item->>'quantity','')!~'^\d{1,7}(\.\d{1,4})?$' OR coalesce(item->>'agreed_unit_net','')!~'^\d{1,7}(\.\d{1,6})?$' THEN RAISE EXCEPTION 'Explicit quantity and net selling price required'; END IF;
  qty:=(item->>'quantity')::numeric;price:=(item->>'agreed_unit_net')::numeric;
  IF qty<=0 OR qty>1000000 OR price>1000000 THEN RAISE EXCEPTION 'Quantity or price outside supported bounds'; END IF;
  SELECT id,name,sku,unit INTO product FROM business_software_price_book_items WHERE id=(item->>'product_id')::uuid AND tenant_id=p_tenant AND active=true FOR SHARE;
  IF NOT FOUND OR item->>'unit' IS DISTINCT FROM coalesce(product.unit,'each') OR item->>'product_name' IS DISTINCT FROM product.name OR item->>'product_sku' IS DISTINCT FROM product.sku THEN RAISE EXCEPTION 'Product identity or saved unit changed. Reload and review'; END IF;
  total:=total+round(qty*price,2);
 END LOOP;
 IF total IS DISTINCT FROM p_total_net THEN RAISE EXCEPTION 'Reviewed line total does not match the approved net total'; END IF;
 INSERT INTO business_software_sales_orders(tenant_id,customer_id,job_id,reference,status) VALUES(p_tenant,p_customer,p_job,nullif(trim(p_reference),''),'draft') RETURNING id INTO result;
 FOR item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  INSERT INTO business_software_sales_order_lines(tenant_id,sales_order_id,product_id,description,quantity,unit,agreed_unit_net) VALUES(p_tenant,result,(item->>'product_id')::uuid,item->>'product_name',(item->>'quantity')::numeric,item->>'unit',(item->>'agreed_unit_net')::numeric);
 END LOOP;
 INSERT INTO business_software_order_request_keys(tenant_id,order_kind,request_key,payload_hash,order_id) VALUES(p_tenant,'sales',stable_key,fingerprint,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.bms_create_reviewed_document_sales(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb,text,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_create_reviewed_document_sales(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb,text,numeric) TO service_role;
