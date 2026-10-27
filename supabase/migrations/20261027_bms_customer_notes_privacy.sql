-- Internal idempotency keys belong in request_key, never customer-facing notes.
-- Keep shared customer creation generic across every BMS tenant.
CREATE OR REPLACE FUNCTION public.bms_create_customer_once(
 p_tenant uuid,p_first text,p_last text,p_email text,p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved business_software_customers%ROWTYPE;
BEGIN
 IF p_tenant IS NULL OR p_first IS NULL OR length(trim(p_first)) NOT BETWEEN 1 AND 100
 OR p_last IS NULL OR length(trim(p_last)) NOT BETWEEN 1 AND 100
 OR length(coalesce(p_email,''))>200 OR p_key IS NULL OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$'
 THEN RAISE EXCEPTION 'Invalid customer request'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.business_software_tenants WHERE id=p_tenant AND status='active') THEN RAISE EXCEPTION 'Tenant unavailable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||p_key,93422));
 SELECT * INTO saved FROM public.business_software_customers WHERE tenant_id=p_tenant AND request_key=p_key LIMIT 1;
 IF FOUND THEN
  IF saved.first_name<>trim(p_first) OR saved.last_name IS DISTINCT FROM trim(p_last)
   OR saved.email IS DISTINCT FROM nullif(trim(coalesce(p_email,'')),'')
  THEN RAISE EXCEPTION 'Customer request key reused with different details'; END IF;
  RETURN jsonb_build_object('id',saved.id,'first_name',saved.first_name,'last_name',saved.last_name,'created',false);
 END IF;
 INSERT INTO public.business_software_customers(tenant_id,first_name,last_name,email,request_key)
 VALUES(p_tenant,trim(p_first),trim(p_last),nullif(trim(coalesce(p_email,'')),''),p_key)
 RETURNING * INTO saved;
 RETURN jsonb_build_object('id',saved.id,'first_name',saved.first_name,'last_name',saved.last_name,'created',true);
END $$;
REVOKE ALL ON FUNCTION public.bms_create_customer_once(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_create_customer_once(uuid,text,text,text,text) TO service_role;