-- Demo reset is transactional and exclusively scoped to the hardcoded fictional tenant.
-- No user, billing, integration or financial payment records are deleted.
CREATE OR REPLACE FUNCTION public.bms_seed_flooring_showcase() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t uuid;s uuid;c uuid;c2 uuid;l uuid;p uuid;tile uuid;lvt uuid;u uuid;j uuid;po uuid;so uuid;pol uuid;sol uuid;
BEGIN
 SELECT id INTO t FROM business_software_tenants WHERE slug='flooring-showcase-demo';
 IF t IS NULL THEN INSERT INTO business_software_tenants(slug,business_name,canonical_host,status,billing_mode,reference_tenant,data_backend) VALUES('flooring-showcase-demo','Oak & Stone Flooring Demo','flooring-showcase.invalid','active','free',false,'central') RETURNING id INTO t; END IF;
 INSERT INTO business_software_tenant_settings(tenant_id,business_name,accent_colour,quote_prefix,invoice_prefix,quote_default_lead_time,features) VALUES(t,'Oak & Stone Flooring Demo','#bf6c3a','FLQ','FLI','7-10 working days','{"flooring":true,"priceBook":true,"purchasing":true,"stock":true,"websiteCatalogue":true}') ON CONFLICT(tenant_id) DO NOTHING;
 SELECT id INTO s FROM business_software_suppliers WHERE tenant_id=t AND name='Harbour Flooring Wholesale';
 IF s IS NULL THEN INSERT INTO business_software_suppliers(tenant_id,name,email,notes) VALUES(t,'Harbour Flooring Wholesale','orders@example.invalid','Fictional supplier') RETURNING id INTO s; END IF;
 SELECT id INTO c FROM business_software_customers WHERE tenant_id=t AND first_name='Sarah' AND last_name='Collins';
 IF c IS NULL THEN INSERT INTO business_software_customers(tenant_id,first_name,last_name,email,notes) VALUES(t,'Sarah','Collins','sarah@example.invalid','Fictional 48 m² flooring customer') RETURNING id INTO c; END IF;
 SELECT id INTO c2 FROM business_software_customers WHERE tenant_id=t AND first_name='North London' AND last_name='Developments';
 IF c2 IS NULL THEN INSERT INTO business_software_customers(tenant_id,first_name,last_name,email) VALUES(t,'North London','Developments','trade@example.invalid') RETURNING id INTO c2; END IF;
 INSERT INTO business_software_stock_locations(tenant_id,name) VALUES(t,'Main flooring warehouse') ON CONFLICT(tenant_id,name) DO UPDATE SET name=excluded.name RETURNING id INTO l;
 SELECT id INTO p FROM business_software_price_book_items WHERE tenant_id=t AND sku='FL-LAM-OAK8';
 IF p IS NULL THEN INSERT INTO business_software_price_book_items(tenant_id,name,sku,category,subcategory,unit,purchase_unit,selling_unit,units_per_pack,cost_net,pricing_method,fixed_sell_net,supplier_id,preferred_supplier_id,show_on_website,specifications)
 VALUES(t,'Natural oak 8mm laminate','FL-LAM-OAK8','Flooring','Laminate','pack','pack','pack',2.2,24,'fixed',39,s,s,true,'{"coverage_m2_per_pack":2.2,"thickness_mm":8,"waste_percent_default":10}') RETURNING id INTO p; END IF;
 SELECT id INTO tile FROM business_software_price_book_items WHERE tenant_id=t AND sku='FL-TILE-GREY60';
 IF tile IS NULL THEN INSERT INTO business_software_price_book_items(tenant_id,name,sku,category,subcategory,unit,purchase_unit,selling_unit,units_per_pack,cost_net,pricing_method,fixed_sell_net,supplier_id,preferred_supplier_id,show_on_website,specifications)
 VALUES(t,'Stone grey porcelain 600 x 600','FL-TILE-GREY60','Tiles','Porcelain','box','box','box',1.44,18,'fixed',31,s,s,true,'{"coverage_m2_per_pack":1.44,"pieces_per_box":4}') RETURNING id INTO tile; END IF;
 SELECT id INTO lvt FROM business_software_price_book_items WHERE tenant_id=t AND sku='FL-LVT-CLICK';
 IF lvt IS NULL THEN INSERT INTO business_software_price_book_items(tenant_id,name,sku,category,subcategory,unit,purchase_unit,selling_unit,units_per_pack,cost_net,pricing_method,fixed_sell_net,supplier_id,preferred_supplier_id,show_on_website,specifications)
 VALUES(t,'Warm oak click LVT','FL-LVT-CLICK','Flooring','LVT','pack','pack','pack',2.5,32,'fixed',49,s,s,true,'{"coverage_m2_per_pack":2.5}') RETURNING id INTO lvt; END IF;
 SELECT id INTO u FROM business_software_price_book_items WHERE tenant_id=t AND sku='FL-UNDERLAY10';
 IF u IS NULL THEN INSERT INTO business_software_price_book_items(tenant_id,name,sku,category,subcategory,unit,purchase_unit,selling_unit,units_per_pack,cost_net,pricing_method,fixed_sell_net,supplier_id,preferred_supplier_id,show_on_website,specifications)
 VALUES(t,'Acoustic underlay 10 m² roll','FL-UNDERLAY10','Accessories','Underlay','roll','roll','roll',10,12,'fixed',21,s,s,true,'{"coverage_m2_per_pack":10}') RETURNING id INTO u; END IF;
 INSERT INTO business_software_customer_prices(tenant_id,customer_id,product_id,sell_net) VALUES(t,c,p,37) ON CONFLICT(tenant_id,customer_id,product_id) DO NOTHING;
 INSERT INTO business_software_customer_prices(tenant_id,customer_id,product_id,sell_net) VALUES(t,c2,tile,28) ON CONFLICT(tenant_id,customer_id,product_id) DO NOTHING;
 SELECT id INTO j FROM business_software_jobs WHERE tenant_id=t AND reference='FL001';
 IF j IS NULL THEN INSERT INTO business_software_jobs(tenant_id,sequence_number,reference,customer_id,job_type,job_title,customer_requirements,dimensions,material,quoted_amount,agreed_amount)
 VALUES(t,1,'FL001',c,'Flooring','48 m² laminate supply and fit','48 m², 10% wastage, 24 packs of 2.2 m²','48 m²','Natural oak laminate',888,888) RETURNING id INTO j; END IF;
 IF NOT EXISTS(SELECT 1 FROM business_software_quotes WHERE tenant_id=t AND job_id=j AND version=1) THEN
 INSERT INTO business_software_quotes(tenant_id,job_id,version,status,scope_text,amount,deposit_amount,vat_rate,lead_time,created_by)
 VALUES(t,j,1,'draft','Supply 24 packs natural oak 8mm laminate, 48 m² plus 10% wastage',888,444,20,'7-10 working days','Demo seed'); END IF;
 IF NOT EXISTS(SELECT 1 FROM business_software_stock_balances WHERE tenant_id=t AND product_id=p AND location_id=l) THEN PERFORM bms_apply_stock_movement(t,p,l,30,'Fictional opening stock','demo_seed','FL001','flooring-demo-opening-oak'); END IF;
 IF NOT EXISTS(SELECT 1 FROM business_software_stock_balances WHERE tenant_id=t AND product_id=tile AND location_id=l) THEN PERFORM bms_apply_stock_movement(t,tile,l,45,'Fictional opening stock','demo_seed','FL001','flooring-demo-opening-tile'); END IF;
 IF NOT EXISTS(SELECT 1 FROM business_software_stock_balances WHERE tenant_id=t AND product_id=lvt AND location_id=l) THEN PERFORM bms_apply_stock_movement(t,lvt,l,18,'Fictional opening stock','demo_seed','FL001','flooring-demo-opening-lvt'); END IF;
 IF NOT EXISTS(SELECT 1 FROM business_software_stock_balances WHERE tenant_id=t AND product_id=u AND location_id=l) THEN PERFORM bms_apply_stock_movement(t,u,l,12,'Fictional opening stock','demo_seed','FL001','flooring-demo-opening-underlay'); END IF;
 po:=bms_create_purchase_order_once(t,s,j,jsonb_build_array(jsonb_build_object('product_id',p,'quantity',20,'unit_cost_net',24)),'Fictional flooring PO','flooring-demo-po-1001');
 so:=bms_create_sales_order_once(t,c,j,jsonb_build_array(jsonb_build_object('product_id',p,'quantity',24)),'SO-2001','flooring-demo-so-2001');
 SELECT id INTO pol FROM business_software_purchase_order_lines WHERE tenant_id=t AND material_order_id=po AND product_id=p;
 SELECT id INTO sol FROM business_software_sales_order_lines WHERE tenant_id=t AND sales_order_id=so AND product_id=p;
 IF NOT EXISTS(SELECT 1 FROM bms_material_receipt_events WHERE tenant_id=t AND line_id=pol) THEN PERFORM bms_receive_purchase_line(t,pol,l,8,'flooring-demo-gr-1001-part1'); END IF;
 IF NOT EXISTS(SELECT 1 FROM business_software_stock_reservation_events WHERE tenant_id=t AND sales_order_line_id=sol) THEN PERFORM bms_reserve_sales_order_line(t,sol,l,12,'flooring-demo-res-2001'); END IF;
 IF NOT EXISTS(SELECT 1 FROM business_software_deliveries WHERE tenant_id=t AND request_key='flooring-demo-delivery-2001') THEN
 INSERT INTO business_software_deliveries(tenant_id,sales_order_id,job_id,status,delivery_address,site_contact,request_key)
 VALUES(t,so,j,'planned','Fictional customer site, North London','Sarah Collins','flooring-demo-delivery-2001');END IF;
 IF NOT EXISTS(SELECT 1 FROM business_software_fitting_assignments WHERE tenant_id=t AND request_key='flooring-demo-fitting-001') THEN
 INSERT INTO business_software_fitting_assignments(tenant_id,job_id,status,site_address,instructions,request_key)
 VALUES(t,j,'scheduled','Fictional customer site, North London','Fit laminate after materials delivered','flooring-demo-fitting-001');END IF;
 IF NOT EXISTS(SELECT 1 FROM business_software_invoices WHERE tenant_id=t AND job_id=j AND invoice_number='FLI-DEMO-001') THEN
 INSERT INTO business_software_invoices(tenant_id,job_id,provider,invoice_number,status,total,amount_due,amount_paid,currency_code,created_by)
 VALUES(t,j,'internal','FLI-DEMO-001','draft',1065.60,1065.60,0,'GBP','Flooring demo seed');END IF;
 IF (SELECT agreed_unit_net FROM business_software_sales_order_lines WHERE id=sol)<>37 THEN RAISE EXCEPTION 'Customer-specific pricing not applied';END IF;
 IF CEIL(48*1.10/2.2)<>24 THEN RAISE EXCEPTION 'Flooring pack calculation failed';END IF;
END $$;
REVOKE ALL ON FUNCTION public.bms_seed_flooring_showcase() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_seed_flooring_showcase() TO service_role;

CREATE OR REPLACE FUNCTION public.bms_reset_flooring_showcase(p_confirm text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t uuid; tab text; tables text[]:=ARRAY['business_software_delivery_lines','business_software_stock_picking_events','business_software_stock_reservation_events','bms_material_receipt_events','business_software_stock_movements','business_software_stock_balances','business_software_fitter_materials','business_software_fitting_assignments','business_software_deliveries','business_software_sales_order_lines','business_software_purchase_order_lines','business_software_order_request_keys','business_software_sales_orders','business_software_material_orders','business_software_estimate_lines','business_software_estimates','business_software_quotes','business_software_invoices','business_software_customer_prices','business_software_stock_locations','business_software_price_book_items','business_software_suppliers','business_software_jobs','business_software_customers'];
BEGIN
 IF p_confirm IS DISTINCT FROM 'RESET OAK AND STONE DEMO' THEN RAISE EXCEPTION 'Explicit demo reset confirmation required'; END IF;
 SELECT id INTO t FROM business_software_tenants WHERE slug='flooring-showcase-demo' AND reference_tenant=false AND canonical_host='flooring-showcase.invalid' FOR UPDATE;
 IF t IS NULL THEN RAISE EXCEPTION 'Fictional demo tenant safety guard failed'; END IF;
 IF EXISTS(SELECT 1 FROM business_software_payments WHERE tenant_id=t) OR EXISTS(SELECT 1 FROM business_software_integrations WHERE tenant_id=t AND status='connected') THEN RAISE EXCEPTION 'Demo has financial or external integrations: reset prohibited'; END IF;
 FOREACH tab IN ARRAY tables LOOP EXECUTE format('DELETE FROM public.%I WHERE tenant_id=$1',tab) USING t; END LOOP;
 PERFORM public.bms_seed_flooring_showcase();
 RETURN jsonb_build_object('reset',true,'tenant','flooring-showcase-demo','fictional',true);
END $$;
REVOKE ALL ON FUNCTION public.bms_reset_flooring_showcase(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_reset_flooring_showcase(text) TO service_role;
