-- Regression: shared enquiry RPC must reject a customer belonging to another tenant.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE demo uuid; other_customer uuid; rejected boolean:=false;
BEGIN
 SELECT id INTO demo FROM business_software_tenants WHERE slug='flooring-showcase-demo';
 SELECT id INTO other_customer FROM business_software_customers WHERE tenant_id<>demo LIMIT 1;
 IF other_customer IS NULL THEN RAISE NOTICE 'No cross-tenant customer fixture available'; RETURN; END IF;
 BEGIN
  PERFORM bms_create_enquiry_once(demo,other_customer,'Unauthorised enquiry',48,'cross-tenant-enquiry-test');
 EXCEPTION WHEN others THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Cross-tenant enquiry customer accepted'; END IF;
END $$;
ROLLBACK;