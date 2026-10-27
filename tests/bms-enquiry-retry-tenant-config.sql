BEGIN;SET LOCAL ROLE service_role;DO $$ DECLARE t uuid;c uuid;a jsonb;b jsonb;failed boolean:=false;jobtype text;source text;BEGIN
 SELECT id INTO t FROM business_software_tenants WHERE slug='flooring-showcase-demo';
 SELECT id INTO c FROM business_software_customers WHERE tenant_id=t LIMIT 1;
 a:=bms_create_enquiry_once(t,c,'Fictional sample enquiry',48,'test-enquiry-retry-001');
 b:=bms_create_enquiry_once(t,c,'Fictional sample enquiry',48,'test-enquiry-retry-001');
 IF a->>'id' IS DISTINCT FROM b->>'id' OR b->>'created'<>'false' THEN RAISE EXCEPTION 'Enquiry retry duplicate';END IF;
 SELECT job_type,enquiry_source INTO jobtype,source FROM business_software_jobs WHERE id=(a->>'id')::uuid;
 IF jobtype<>'Flooring' OR source<>'Website catalogue' THEN RAISE EXCEPTION 'Tenant feature mapping failed: %, %',jobtype,source;END IF;
 BEGIN PERFORM bms_create_enquiry_once(t,c,'Changed enquiry payload',48,'test-enquiry-retry-001');EXCEPTION WHEN others THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Conflicting enquiry retry accepted';END IF;
END $$;ROLLBACK;