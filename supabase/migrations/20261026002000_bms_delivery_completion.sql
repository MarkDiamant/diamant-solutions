-- Atomic, idempotent delivery confirmation for picked sales-order quantities.
ALTER TABLE public.business_software_deliveries ADD COLUMN IF NOT EXISTS completion_key text;
CREATE UNIQUE INDEX IF NOT EXISTS bms_delivery_completion_key_unique ON public.business_software_deliveries(tenant_id,completion_key) WHERE completion_key IS NOT NULL;
CREATE OR REPLACE FUNCTION public.bms_confirm_delivery(p_tenant uuid,p_delivery uuid,p_key text,p_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE d record;ln record;v_qty numeric;v_total numeric:=0;
BEGIN
 IF p_key IS NULL OR p_key !~ '^[a-zA-Z0-9:_-]{8,150}$' THEN RAISE EXCEPTION 'Stable delivery completion key required';END IF;
 SELECT * INTO d FROM business_software_deliveries WHERE tenant_id=p_tenant AND id=p_delivery FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found in tenant';END IF;
 IF d.status='delivered' THEN
  IF d.completion_key=p_key THEN RETURN d.id;END IF;
  RAISE EXCEPTION 'Delivery already completed with a different request';
 END IF;
 IF d.status NOT IN ('planned','in_transit','ready') THEN RAISE EXCEPTION 'Delivery cannot be completed from its current status';END IF;
 IF EXISTS(SELECT 1 FROM business_software_deliveries WHERE tenant_id=p_tenant AND completion_key=p_key AND id<>p_delivery) THEN RAISE EXCEPTION 'Delivery completion key already used';END IF;
 FOR ln IN SELECT id,picked_quantity,fulfilled_quantity,quantity FROM business_software_sales_order_lines WHERE tenant_id=p_tenant AND sales_order_id=d.sales_order_id ORDER BY id FOR UPDATE LOOP
  v_qty:=ln.picked_quantity-ln.fulfilled_quantity;
  IF v_qty<0 OR ln.fulfilled_quantity>ln.quantity OR ln.picked_quantity>ln.quantity THEN RAISE EXCEPTION 'Inconsistent sales line picking or fulfilment';END IF;
  IF v_qty>0 THEN
   INSERT INTO business_software_delivery_lines(tenant_id,delivery_id,sales_order_line_id,quantity,delivered_quantity) VALUES(p_tenant,p_delivery,ln.id,v_qty,v_qty);
   UPDATE business_software_sales_order_lines SET fulfilled_quantity=fulfilled_quantity+v_qty WHERE id=ln.id AND tenant_id=p_tenant;
   v_total:=v_total+v_qty;
  END IF;
 END LOOP;
 IF v_total<=0 THEN RAISE EXCEPTION 'Pick goods before confirming delivery';END IF;
 UPDATE business_software_deliveries SET status='delivered',delivered_at=now(),completion_key=p_key,delivery_notes=nullif(left(coalesce(p_notes,''),1000),'') WHERE tenant_id=p_tenant AND id=p_delivery;
 RETURN p_delivery;
END $$;
REVOKE ALL ON FUNCTION public.bms_confirm_delivery(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_confirm_delivery(uuid,uuid,text,text) TO service_role;
