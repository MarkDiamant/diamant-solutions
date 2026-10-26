-- Shared master BMS: prevent duplicate order creation on uncertain network retries.
CREATE TABLE IF NOT EXISTS public.business_software_order_request_keys(
 tenant_id uuid NOT NULL,
 order_kind text NOT NULL CHECK (order_kind IN ('purchase','sales')),
 request_key text NOT NULL,
 payload_hash text NOT NULL,
 order_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,order_kind,request_key)
);
ALTER TABLE public.business_software_order_request_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_software_order_request_keys FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.bms_create_purchase_order_once(p_tenant uuid,p_supplier uuid,p_job uuid,p_lines jsonb,p_notes text,p_key text)
RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_hash text;v_existing record;v_id uuid;
BEGIN
 IF p_key IS NULL OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$' THEN RAISE EXCEPTION 'Stable purchase order request key required';END IF;
 v_hash:=md5(jsonb_build_object('supplier',p_supplier,'job',p_job,'lines',p_lines,'notes',coalesce(p_notes,''))::text);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||':purchase:'||p_key,0));
 SELECT order_id,payload_hash INTO v_existing FROM public.business_software_order_request_keys WHERE tenant_id=p_tenant AND order_kind='purchase' AND request_key=p_key;
 IF FOUND THEN
  IF v_existing.payload_hash<>v_hash THEN RAISE EXCEPTION 'Purchase request key reused with changed order';END IF;
  RETURN v_existing.order_id;
 END IF;
 v_id:=public.bms_create_purchase_order(p_tenant,p_supplier,p_job,p_lines,p_notes);
 INSERT INTO public.business_software_order_request_keys(tenant_id,order_kind,request_key,payload_hash,order_id) VALUES(p_tenant,'purchase',p_key,v_hash,v_id);
 RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.bms_create_sales_order_once(p_tenant uuid,p_customer uuid,p_job uuid,p_lines jsonb,p_reference text,p_key text)
RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_hash text;v_existing record;v_id uuid;
BEGIN
 IF p_key IS NULL OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$' THEN RAISE EXCEPTION 'Stable sales order request key required';END IF;
 v_hash:=md5(jsonb_build_object('customer',p_customer,'job',p_job,'lines',p_lines,'reference',coalesce(p_reference,''))::text);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||':sales:'||p_key,0));
 SELECT order_id,payload_hash INTO v_existing FROM public.business_software_order_request_keys WHERE tenant_id=p_tenant AND order_kind='sales' AND request_key=p_key;
 IF FOUND THEN
  IF v_existing.payload_hash<>v_hash THEN RAISE EXCEPTION 'Sales request key reused with changed order';END IF;
  RETURN v_existing.order_id;
 END IF;
 v_id:=public.bms_create_sales_order(p_tenant,p_customer,p_job,p_lines,p_reference);
 INSERT INTO public.business_software_order_request_keys(tenant_id,order_kind,request_key,payload_hash,order_id) VALUES(p_tenant,'sales',p_key,v_hash,v_id);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.bms_create_purchase_order_once(uuid,uuid,uuid,jsonb,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bms_create_sales_order_once(uuid,uuid,uuid,jsonb,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_create_purchase_order_once(uuid,uuid,uuid,jsonb,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.bms_create_sales_order_once(uuid,uuid,uuid,jsonb,text,text) TO service_role;
