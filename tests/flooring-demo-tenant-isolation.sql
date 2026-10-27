-- Shared BMS regression: verify isolated demo stock operations cannot target another tenant.
-- Execute in a transaction. No live or demo data is persisted.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE demo uuid; location uuid; other_line uuid; denied boolean:=false;
BEGIN
 SELECT id INTO demo FROM business_software_tenants WHERE slug='flooring-showcase-demo';
 IF demo IS NULL THEN RAISE EXCEPTION 'Fictional demo tenant missing'; END IF;
 SELECT id INTO location FROM business_software_stock_locations WHERE tenant_id=demo LIMIT 1;
 IF location IS NULL THEN RAISE EXCEPTION 'Demo warehouse missing'; END IF;
 SELECT id INTO other_line FROM business_software_purchase_order_lines WHERE tenant_id<>demo LIMIT 1;
 IF other_line IS NOT NULL THEN
  BEGIN
   PERFORM bms_receive_purchase_line(demo,other_line,location,1,'cross-tenant-receipt-denied');
  EXCEPTION WHEN others THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Cross-tenant receipt was accepted'; END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM business_software_price_book_items WHERE tenant_id=demo AND show_on_website=true) THEN
  RAISE EXCEPTION 'Fictional connected website catalogue missing';
 END IF;
END $$;
ROLLBACK;
