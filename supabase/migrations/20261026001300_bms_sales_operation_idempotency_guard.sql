-- Reject idempotency key reuse for different sales reservation or picking payloads.
CREATE OR REPLACE FUNCTION public.bms_pick_sales_order_line(p_tenant uuid, p_line uuid, p_location uuid, p_qty numeric, p_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_line record;v_done boolean;v_at_location numeric;begin
 if p_qty<=0 or nullif(trim(p_key),'') is null then raise exception 'Invalid picking';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':pick:'||p_key,0));
 if exists(select 1 from business_software_stock_picking_events where tenant_id=p_tenant and idempotency_key=p_key) then
  if not exists(select 1 from business_software_stock_picking_events where tenant_id=p_tenant and idempotency_key=p_key and sales_order_line_id=p_line and location_id=p_location and quantity=p_qty) then raise exception 'Idempotency key reused with different sales operation';end if;
  return false;
 end if;
 select l.* into v_line from business_software_sales_order_lines l join business_software_sales_orders o on o.id=l.sales_order_id and o.tenant_id=l.tenant_id where l.id=p_line and l.tenant_id=p_tenant and o.status<>'cancelled' for update of l;
 if not found or v_line.product_id is null then raise exception 'Sales order line unavailable';end if;
 select coalesce((select sum(quantity_delta) from business_software_stock_reservation_events where tenant_id=p_tenant and sales_order_line_id=p_line and location_id=p_location),0)-coalesce((select sum(quantity) from business_software_stock_picking_events where tenant_id=p_tenant and sales_order_line_id=p_line and location_id=p_location),0) into v_at_location;
 if v_at_location<p_qty or v_line.reserved_quantity<p_qty or v_line.picked_quantity+p_qty>v_line.quantity then raise exception 'Insufficient sales line reservation at this location';end if;
 perform bms_reserve_stock(p_tenant,v_line.product_id,p_location,-p_qty);
 v_done:=bms_apply_stock_movement(p_tenant,v_line.product_id,p_location,-p_qty,'Warehouse picking','sales_order_line',p_line::text,'pick:'||p_key);
 if not v_done then raise exception 'Picking movement already processed';end if;
 update business_software_sales_order_lines set reserved_quantity=reserved_quantity-p_qty,picked_quantity=picked_quantity+p_qty where id=p_line and tenant_id=p_tenant;
 insert into business_software_stock_picking_events(tenant_id,sales_order_line_id,product_id,location_id,quantity,idempotency_key) values(p_tenant,p_line,v_line.product_id,p_location,p_qty,p_key);
 return true;
end $function$
;
CREATE OR REPLACE FUNCTION public.bms_reserve_sales_order_line(p_tenant uuid, p_line uuid, p_location uuid, p_qty numeric, p_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_line record;v_balance numeric;begin
 if p_qty<=0 or nullif(trim(p_key),'') is null then raise exception 'Invalid reservation';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':reservation:'||p_key,0));
 if exists(select 1 from business_software_stock_reservation_events where tenant_id=p_tenant and idempotency_key=p_key) then
  if not exists(select 1 from business_software_stock_reservation_events where tenant_id=p_tenant and idempotency_key=p_key and sales_order_line_id=p_line and location_id=p_location and quantity_delta=p_qty) then raise exception 'Idempotency key reused with different sales operation';end if;
  return false;
 end if;
 select l.* into v_line from business_software_sales_order_lines l join business_software_sales_orders o on o.id=l.sales_order_id and o.tenant_id=l.tenant_id where l.tenant_id=p_tenant and l.id=p_line and o.status<>'cancelled' for update of l;
 if not found or v_line.product_id is null then raise exception 'Sales order line not available';end if;
 if v_line.reserved_quantity+v_line.picked_quantity+p_qty>v_line.quantity then raise exception 'Reservation exceeds order quantity';end if;
 v_balance:=bms_reserve_stock(p_tenant,v_line.product_id,p_location,p_qty);
 update business_software_sales_order_lines set reserved_quantity=reserved_quantity+p_qty where id=p_line and tenant_id=p_tenant;
 insert into business_software_stock_reservation_events(tenant_id,sales_order_line_id,product_id,location_id,quantity_delta,idempotency_key) values(p_tenant,p_line,v_line.product_id,p_location,p_qty,p_key);
 return true;
end $function$
;