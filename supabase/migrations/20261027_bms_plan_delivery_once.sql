-- Shared tenant-safe, idempotent delivery planning for all BMS industries.
CREATE OR REPLACE FUNCTION public.bms_plan_delivery_once(
 p_tenant uuid,p_sales_order uuid,p_address text,p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE so business_software_sales_orders%ROWTYPE; prior business_software_deliveries%ROWTYPE; saved business_software_deliveries%ROWTYPE;
BEGIN
 IF p_tenant IS NULL OR p_sales_order IS NULL OR p_address IS NULL OR length(trim(p_address)) NOT BETWEEN 5 AND 300
 OR p_key IS NULL OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$' THEN RAISE EXCEPTION 'Invalid delivery plan'; END IF;
 SELECT * INTO so FROM public.business_software_sales_orders WHERE tenant_id=p_tenant AND id=p_sales_order;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sales order is outside tenant'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||p_key, 94741));
 SELECT * INTO prior FROM public.business_software_deliveries WHERE tenant_id=p_tenant AND request_key=p_key LIMIT 1;
 IF FOUND THEN
  IF prior.sales_order_id<>p_sales_order OR prior.delivery_address IS DISTINCT FROM trim(p_address) THEN
   RAISE EXCEPTION 'Delivery request key reused with different details'; END IF;
  RETURN jsonb_build_object('id',prior.id,'status',prior.status,'created',false);
 END IF;
 INSERT INTO public.business_software_deliveries(tenant_id,sales_order_id,job_id,delivery_address,status,request_key)
 VALUES(p_tenant,p_sales_order,so.job_id,trim(p_address),'planned',p_key) RETURNING * INTO saved;
 RETURN jsonb_build_object('id',saved.id,'status',saved.status,'created',true);
END $$;
REVOKE ALL ON FUNCTION public.bms_plan_delivery_once(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_plan_delivery_once(uuid,uuid,text,text) TO service_role;