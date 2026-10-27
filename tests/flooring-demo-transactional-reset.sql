-- Rollback-only reset acceptance test. The production demo and all live tenants remain unchanged.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE demo uuid; before_live bigint; after_live bigint; result jsonb; n int;
BEGIN
 SELECT id INTO demo FROM business_software_tenants WHERE slug='flooring-showcase-demo';
 IF demo IS NULL THEN RAISE EXCEPTION 'Missing fictional demo tenant'; END IF;
 SELECT count(*) INTO before_live FROM business_software_jobs WHERE tenant_id<>demo;
 BEGIN
  PERFORM bms_reset_flooring_showcase('wrong confirmation');
  RAISE EXCEPTION 'Reset accepted incorrect confirmation';
 EXCEPTION WHEN others THEN
  IF SQLERRM='Reset accepted incorrect confirmation' THEN RAISE; END IF;
 END;
 result:=bms_reset_flooring_showcase('RESET OAK AND STONE DEMO');
 IF result->>'reset' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Reset did not succeed'; END IF;
 SELECT count(*) INTO n FROM business_software_price_book_items WHERE tenant_id=demo AND show_on_website=true;
 IF n<4 THEN RAISE EXCEPTION 'Website catalogue not restored'; END IF;
 SELECT count(*) INTO n FROM business_software_customers WHERE tenant_id=demo;
 IF n<2 THEN RAISE EXCEPTION 'Customers not restored'; END IF;
 SELECT count(*) INTO n FROM business_software_invoices WHERE tenant_id=demo AND provider='internal' AND status='draft';
 IF n<1 THEN RAISE EXCEPTION 'Internal invoice not restored'; END IF;
 SELECT count(*) INTO after_live FROM business_software_jobs WHERE tenant_id<>demo;
 IF after_live<>before_live THEN RAISE EXCEPTION 'Live tenant job count changed'; END IF;
END $$;
ROLLBACK;
