CREATE OR REPLACE FUNCTION public.bms_create_enquiry_once(p_tenant uuid,p_customer uuid,p_title text,p_area_m2 numeric,p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE jid uuid; seq int; ref text; prefix text;
BEGIN
 IF p_tenant IS NULL OR p_customer IS NULL OR length(trim(coalesce(p_title,''))) NOT BETWEEN 3 AND 160 OR p_area_m2<=0 OR p_area_m2>100000 OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$' THEN RAISE EXCEPTION 'Invalid enquiry'; END IF;
 IF NOT EXISTS(SELECT 1 FROM business_software_customers WHERE id=p_customer AND tenant_id=p_tenant) THEN RAISE EXCEPTION 'Customer not in tenant'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text,17371));
 SELECT id INTO jid FROM business_software_jobs WHERE tenant_id=p_tenant AND internal_notes='Enquiry request: '||p_key LIMIT 1;
 IF jid IS NOT NULL THEN RETURN (SELECT jsonb_build_object('id',id,'reference',reference,'created',false) FROM business_software_jobs WHERE id=jid); END IF;
 SELECT coalesce(max(sequence_number),0)+1 INTO seq FROM business_software_jobs WHERE tenant_id=p_tenant;
 SELECT coalesce(nullif(app_config->>'jobPrefix',''),'JOB') INTO prefix FROM business_software_tenant_settings WHERE tenant_id=p_tenant;
 ref:=coalesce(prefix,'JOB')||lpad(seq::text,3,'0');
 INSERT INTO business_software_jobs(tenant_id,sequence_number,reference,customer_id,job_type,job_title,dimensions,customer_requirements,internal_notes,status,enquiry_source)
 VALUES(p_tenant,seq,ref,p_customer,'Flooring',trim(p_title),p_area_m2::text||' m²','Customer enquiry for '||p_area_m2::text||' m²','Enquiry request: '||p_key,'new_enquiry','Website catalogue')
 RETURNING id INTO jid;
 RETURN jsonb_build_object('id',jid,'reference',ref,'created',true);
END $$;
REVOKE ALL ON FUNCTION public.bms_create_enquiry_once(uuid,uuid,text,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_create_enquiry_once(uuid,uuid,text,numeric,text) TO service_role;