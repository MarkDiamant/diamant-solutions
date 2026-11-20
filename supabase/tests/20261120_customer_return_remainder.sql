-- Run after the fictional flooring seed, with the candidate functions, inside a rollback transaction.
DO $$
DECLARE t uuid; p uuid; l uuid; s uuid; so uuid; line uuid; po uuid; pol uuid; d uuid; r jsonb; result_id uuid; returned numeric; before_finance bigint;
BEGIN
 SELECT id INTO t FROM business_software_tenants WHERE slug='flooring-showcase-demo' AND canonical_host='flooring-showcase.invalid';
 IF t IS NULL THEN RAISE EXCEPTION 'Fictional identity missing'; END IF;
 SELECT id INTO p FROM business_software_price_book_items WHERE tenant_id=t AND sku='FL-LAM-OAK8';
 SELECT id INTO l FROM business_software_stock_locations WHERE tenant_id=t LIMIT 1;
 SELECT id INTO s FROM business_software_suppliers WHERE tenant_id=t LIMIT 1;
 SELECT id INTO so FROM business_software_sales_orders WHERE tenant_id=t AND reference='SO-2001';
 SELECT id INTO line FROM business_software_sales_order_lines WHERE tenant_id=t AND sales_order_id=so AND product_id=p;
 -- Eight seeded packs at24 and four additional packs at31 produce repeating proportional quantities.
 UPDATE business_software_inventory_cost_layers SET received_at='2026-01-01T00:00:00Z' WHERE tenant_id=t;
 po:=bms_create_purchase_order_once(t,s,NULL,jsonb_build_array(jsonb_build_object('product_id',p,'quantity',4,'unit_cost_net',31)),'Fictional precision test','precision-return-po');
 PERFORM bms_mark_purchase_order_ordered(t,po);
 SELECT id INTO pol FROM business_software_purchase_order_lines WHERE tenant_id=t AND material_order_id=po;
 PERFORM bms_receive_purchase_line(t,pol,l,4,'precision-return-receipt');
 UPDATE business_software_inventory_cost_layers SET received_at='2026-02-01T00:00:00Z' WHERE tenant_id=t AND unit_cost_net=31;
 PERFORM bms_pick_sales_order_line(t,line,l,12,'precision-return-pick');
 d:=(bms_plan_delivery_once(t,so,'Fictional precision return site','precision-return-delivery')->>'id')::uuid;
 PERFORM bms_confirm_delivery(t,d,'precision-return-delivered','Fictional test');
 IF (SELECT count(*) FROM business_software_inventory_cost_allocations WHERE tenant_id=t)<>2 THEN RAISE EXCEPTION 'Expected two original allocations'; END IF;
 -- Deterministic order, changed by the harness to test both directions.
 UPDATE business_software_inventory_cost_allocations SET id=CASE WHEN quantity=8 THEN '00000000-0000-4000-8000-000000000001'::uuid ELSE '00000000-0000-4000-8000-000000000002'::uuid END WHERE tenant_id=t;
 SELECT count(*) INTO before_finance FROM business_software_payments WHERE tenant_id=t;
 FOR returned IN SELECT unnest(ARRAY[2::numeric,1::numeric,9::numeric]) LOOP
  r:=bms_record_customer_return(t,line,l,returned,true,'Fictional precision return','precision-return-'||returned::text);
  result_id:=(r->>'id')::uuid;
  IF (r->>'stock_reinstated')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Expected verified restock'; END IF;
  IF (SELECT sum(quantity) FROM business_software_customer_return_cost_sources WHERE tenant_id=t AND customer_return_id=result_id)<>returned THEN RAISE EXCEPTION 'Persisted source quantities do not reconcile'; END IF;
  IF (SELECT sum(quantity_received) FROM business_software_inventory_cost_layers WHERE tenant_id=t AND source_type='customer_return' AND source_id LIKE result_id::text||':%')<>returned THEN RAISE EXCEPTION 'Persisted layers do not reconcile'; END IF;
  IF EXISTS(SELECT 1 FROM business_software_customer_return_cost_sources x JOIN business_software_inventory_cost_allocations a ON a.id=x.original_allocation_id WHERE x.tenant_id=t AND x.customer_return_id=result_id AND (x.unit_cost_net<>a.unit_cost_net OR x.quantity<=0)) THEN RAISE EXCEPTION 'Original recorded cost changed'; END IF;
  IF (bms_record_customer_return(t,line,l,returned,true,'Fictional precision return','precision-return-'||returned::text)->>'created')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'Replay created duplicate'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM business_software_inventory_cost_allocations a WHERE a.tenant_id=t AND a.quantity IS DISTINCT FROM (SELECT sum(x.quantity) FROM business_software_customer_return_cost_sources x WHERE x.tenant_id=t AND x.original_allocation_id=a.id)) THEN RAISE EXCEPTION 'Cumulative original quantity does not reconcile'; END IF;
 IF (SELECT sum(quantity) FROM business_software_customer_returns WHERE tenant_id=t AND sales_order_line_id=line)<>12 THEN RAISE EXCEPTION 'Repeated returns wrong total'; END IF;
 BEGIN
  PERFORM bms_record_customer_return(t,line,l,1,true,'Fictional overreturn','precision-return-over');
  RAISE EXCEPTION 'Overreturn accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='Overreturn accepted' THEN RAISE; END IF; END;
 IF (SELECT count(*) FROM business_software_payments WHERE tenant_id=t)<>before_finance THEN RAISE EXCEPTION 'Payment unexpectedly created'; END IF;
END $$;
