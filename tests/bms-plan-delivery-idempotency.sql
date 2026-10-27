BEGIN;SET LOCAL ROLE service_role;DO $$ DECLARE t uuid;so uuid;other uuid;a jsonb;b jsonb;bad boolean:=false;BEGIN
 SELECT id INTO t FROM business_software_tenants WHERE slug='flooring-showcase-demo';
 SELECT id INTO so FROM business_software_sales_orders WHERE tenant_id=t LIMIT 1;
 SELECT id INTO other FROM business_software_sales_orders WHERE tenant_id<>t LIMIT 1;
 a:=bms_plan_delivery_once(t,so,'Fictional Delivery Test Address, London','test-delivery-plan-001');
 b:=bms_plan_delivery_once(t,so,'Fictional Delivery Test Address, London','test-delivery-plan-001');
 IF a->>'id' IS DISTINCT FROM b->>'id' OR b->>'created'<>'false' THEN RAISE EXCEPTION 'Delivery retry not idempotent';END IF;
 BEGIN PERFORM bms_plan_delivery_once(t,so,'Different Fictional Address, London','test-delivery-plan-001');EXCEPTION WHEN others THEN bad:=true;END;
 IF NOT bad THEN RAISE EXCEPTION 'Conflicting delivery retry accepted';END IF;
 IF other IS NOT NULL THEN bad:=false;BEGIN PERFORM bms_plan_delivery_once(t,other,'Fictional Cross Tenant Address, London','test-delivery-plan-cross');EXCEPTION WHEN others THEN bad:=true;END;IF NOT bad THEN RAISE EXCEPTION 'Cross tenant delivery accepted';END IF;END IF;
END $$;ROLLBACK;