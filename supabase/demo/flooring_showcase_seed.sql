-- Fictional isolated flooring demo. Never modifies an existing live tenant.
DO $$
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
 IF (SELECT agreed_unit_net FROM business_software_sales_order_lines WHERE id=sol)<>37 THEN RAISE EXCEPTION 'Customer-specific pricing not applied';END IF;
 IF CEIL(48*1.10/2.2)<>24 THEN RAISE EXCEPTION 'Flooring pack calculation failed';END IF;
END $$;