-- End-to-end database acceptance, fictional tenant only; transaction always rolls back.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE t uuid;c uuid;s uuid;j uuid;p uuid;l uuid; enquiry jsonb;so uuid;po uuid;sl uuid;pl uuid;delivery uuid;unit_net numeric; packs int;live_before bigint;live_after bigint;
BEGIN
 SELECT id INTO t FROM business_software_tenants WHERE slug='flooring-showcase-demo' AND canonical_host='flooring-showcase.invalid';
 IF t IS NULL THEN RAISE EXCEPTION 'Demo guard failed'; END IF;
 SELECT count(*) INTO live_before FROM business_software_jobs WHERE tenant_id<>t;
 SELECT id INTO c FROM business_software_customers WHERE tenant_id=t AND first_name='Sarah' LIMIT 1;
 SELECT id INTO s FROM business_software_suppliers WHERE tenant_id=t LIMIT 1;
 SELECT id INTO p FROM business_software_price_book_items WHERE tenant_id=t AND sku='FL-LAM-OAK8';
 SELECT id INTO l FROM business_software_stock_locations WHERE tenant_id=t LIMIT 1;
 IF c IS NULL OR s IS NULL OR p IS NULL OR l IS NULL THEN RAISE EXCEPTION 'Seed records missing'; END IF;
 packs:=ceil(48*1.1/2.2);
 IF packs<>24 THEN RAISE EXCEPTION 'Pack rounding failed'; END IF;
 enquiry:=bms_create_enquiry_once(t,c,'48 m2 oak floor fitting',48,'test-full-workflow-enquiry');
 j:=(enquiry->>'id')::uuid;
 PERFORM bms_create_quote_revision_once(t,j,'Supply 24 oak laminate packs',888,20,'7-10 working days','test-full-workflow-quote','Workflow acceptance');
 so:=bms_create_sales_order_once(t,c,j,jsonb_build_array(jsonb_build_object('product_id',p,'quantity',packs,'area_m2',48,'wastage_percent',10)),'SO-TEST-FLOW','test-full-workflow-so');
 SELECT agreed_unit_net,id INTO unit_net,sl FROM business_software_sales_order_lines WHERE tenant_id=t AND sales_order_id=so;
 IF unit_net<>37 THEN RAISE EXCEPTION 'Customer-specific price failed: %',unit_net; END IF;
 po:=bms_create_purchase_order_once(t,s,j,jsonb_build_array(jsonb_build_object('product_id',p,'quantity',packs,'unit_cost_net',24)),'Test fictional purchase','test-full-workflow-po');
 SELECT id INTO pl FROM business_software_purchase_order_lines WHERE tenant_id=t AND material_order_id=po;
 PERFORM bms_receive_purchase_line(t,pl,l,12,'test-full-workflow-receipt-1');
 PERFORM bms_receive_purchase_line(t,pl,l,12,'test-full-workflow-receipt-2');
 PERFORM bms_reserve_sales_order_line(t,sl,l,12,'test-full-workflow-reserve');
 PERFORM bms_pick_sales_order_line(t,sl,l,12,'test-full-workflow-pick');
 INSERT INTO business_software_deliveries(tenant_id,sales_order_id,job_id,status,delivery_address,request_key)
 VALUES(t,so,j,'planned','Fictional site, London','test-full-workflow-delivery') RETURNING id INTO delivery;
 PERFORM bms_confirm_delivery(t,delivery,'test-full-workflow-delivery-confirm','Acceptance test');
 INSERT INTO business_software_invoices(tenant_id,job_id,provider,invoice_number,status,total,amount_due,amount_paid,currency_code,created_by)
 VALUES(t,j,'internal','FLI-TEST-FLOW','draft',1065.60,1065.60,0,'GBP','Workflow acceptance');
 IF NOT EXISTS(SELECT 1 FROM business_software_invoices WHERE tenant_id=t AND job_id=j AND status='draft') THEN RAISE EXCEPTION 'Invoice missing'; END IF;
 SELECT count(*) INTO live_after FROM business_software_jobs WHERE tenant_id<>t;
 IF live_before<>live_after THEN RAISE EXCEPTION 'Live tenant changed'; END IF;
END $$;
ROLLBACK;
