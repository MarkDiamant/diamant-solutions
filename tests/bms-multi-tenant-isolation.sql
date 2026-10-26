-- BMS shared-core tenant isolation regression test.
-- Safe to run against a staging database. All fixtures are rolled back.
-- No real tenant ID, credentials, payment, or supplier order is used.
BEGIN;
DO $$
DECLARE a uuid; b uuid; ca uuid; cb uuid; pa uuid; pb uuid; la uuid; lb uuid; so uuid; denied boolean;
BEGIN
 INSERT INTO public.business_software_tenants(slug,business_name,canonical_host)
 VALUES ('isolation-a-'||substr(gen_random_uuid()::text,1,8),'BMS Isolated A','tenant-a.invalid') RETURNING id INTO a;
 INSERT INTO public.business_software_tenants(slug,business_name,canonical_host)
 VALUES ('isolation-b-'||substr(gen_random_uuid()::text,1,8),'BMS Isolated B','tenant-b.invalid') RETURNING id INTO b;
 INSERT INTO public.business_software_customers(tenant_id,first_name) VALUES(a,'A customer') RETURNING id INTO ca;
 INSERT INTO public.business_software_customers(tenant_id,first_name) VALUES(b,'B customer') RETURNING id INTO cb;
 INSERT INTO public.business_software_price_book_items(tenant_id,name) VALUES(a,'A laminate') RETURNING id INTO pa;
 INSERT INTO public.business_software_price_book_items(tenant_id,name) VALUES(b,'B tile') RETURNING id INTO pb;
 INSERT INTO public.business_software_stock_locations(tenant_id,name) VALUES(a,'A warehouse') RETURNING id INTO la;
 INSERT INTO public.business_software_stock_locations(tenant_id,name) VALUES(b,'B warehouse') RETURNING id INTO lb;
 INSERT INTO public.business_software_sales_orders(tenant_id,customer_id,reference) VALUES(a,ca,'A-ORDER') RETURNING id INTO so;
 INSERT INTO public.business_software_sales_order_lines(tenant_id,sales_order_id,product_id,description,quantity,unit,agreed_unit_net)
 VALUES(a,so,pa,'A laminate',2,'pack',39);
 IF public.bms_apply_stock_movement(a,pa,la,10,'test receipt','test','a','unique-test-a') IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Stock receipt failed'; END IF;
 IF public.bms_apply_stock_movement(a,pa,la,10,'test receipt','test','a','unique-test-a') IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Idempotency failed'; END IF;
 IF (SELECT on_hand FROM public.business_software_stock_balances WHERE tenant_id=a AND product_id=pa AND location_id=la)<>10
 THEN RAISE EXCEPTION 'Stock count failed'; END IF;
 denied:=false;
 BEGIN INSERT INTO public.business_software_sales_orders(tenant_id,customer_id,reference) VALUES(a,cb,'CROSS-CUSTOMER');
 EXCEPTION WHEN check_violation OR foreign_key_violation THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-tenant customer was accepted'; END IF;
 denied:=false;
 BEGIN INSERT INTO public.business_software_sales_order_lines(tenant_id,sales_order_id,product_id,description,quantity,unit,agreed_unit_net)
 VALUES(b,so,pb,'Cross-order',1,'each',1);
 EXCEPTION WHEN check_violation OR foreign_key_violation THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-tenant order line was accepted'; END IF;
 denied:=false;
 BEGIN PERFORM public.bms_apply_stock_movement(a,pb,la,1,'invalid','test','b','cross-stock');
 EXCEPTION WHEN others THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-tenant stock was accepted'; END IF;
 RAISE NOTICE 'BMS tenant isolation checks passed. Fixtures will be rolled back.';
END $$;
ROLLBACK;
