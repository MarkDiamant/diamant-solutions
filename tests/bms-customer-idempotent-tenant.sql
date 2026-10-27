BEGIN;SET LOCAL ROLE service_role;DO $$ DECLARE t uuid;other uuid;a jsonb;b jsonb;failed boolean:=false;BEGIN
SELECT id INTO t FROM business_software_tenants WHERE slug='flooring-showcase-demo';
SELECT id INTO other FROM business_software_tenants WHERE id<>t LIMIT 1;
a:=bms_create_customer_once(t,'Sample','Customer','sample@example.test','test-customer-once-001');
b:=bms_create_customer_once(t,'Sample','Customer','sample@example.test','test-customer-once-001');
IF a->>'id' IS DISTINCT FROM b->>'id' OR b->>'created'<>'false' THEN RAISE EXCEPTION 'Duplicate customer request not deduplicated';END IF;
BEGIN PERFORM bms_create_customer_once(t,'Different','Customer','sample@example.test','test-customer-once-001');EXCEPTION WHEN others THEN failed:=true;END;
IF NOT failed THEN RAISE EXCEPTION 'Conflicting customer retry accepted';END IF;
IF other IS NOT NULL AND EXISTS(SELECT 1 FROM business_software_customers WHERE tenant_id=other AND request_key='test-customer-once-001') THEN RAISE EXCEPTION 'Cross-tenant contamination';END IF;
END $$;ROLLBACK;