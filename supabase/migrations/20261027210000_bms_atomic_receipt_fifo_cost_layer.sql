-- Verified goods receipts create a FIFO cost layer in the same transaction as physical stock.
-- Partial receipts use distinct idempotency keys. Repeated identical receipt keys do not duplicate cost.
create or replace function public.bms_receive_purchase_line(p_tenant uuid,p_line uuid,p_location uuid,p_qty numeric,p_receipt_key text)
returns boolean language plpgsql set search_path=public as $$
declare v_line record;v_changed boolean;v_movement uuid;
begin
 if p_qty is null or p_qty<=0 or p_receipt_key is null or trim(p_receipt_key)='' then raise exception 'Invalid receipt';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':receipt:'||p_receipt_key,0));
 if exists(select 1 from business_software_stock_movements where tenant_id=p_tenant and idempotency_key='receipt:'||p_receipt_key) then
  if not exists(select 1 from business_software_stock_movements where tenant_id=p_tenant and idempotency_key='receipt:'||p_receipt_key and source_type='purchase_order_line' and source_id=p_line::text and location_id=p_location and quantity_delta=p_qty) then raise exception 'Receipt key reused with different goods receipt';end if;
  return false;
 end if;
 select l.* into v_line from business_software_purchase_order_lines l join business_software_material_orders o on o.id=l.material_order_id and o.tenant_id=l.tenant_id where l.id=p_line and l.tenant_id=p_tenant for update of l;
 if not found or v_line.product_id is null then raise exception 'Purchase line or product unavailable';end if;
 if v_line.received_quantity+p_qty>v_line.ordered_quantity then raise exception 'Receipt exceeds ordered quantity';end if;
 if v_line.unit_cost_net is null or v_line.unit_cost_net<0 then raise exception 'Verified nonnegative purchase line cost required';end if;
 v_changed:=bms_apply_stock_movement(p_tenant,v_line.product_id,p_location,p_qty,'Purchase order goods received','purchase_order_line',p_line::text,'receipt:'||p_receipt_key);
 if not v_changed then return false;end if;
 select id into v_movement from business_software_stock_movements where tenant_id=p_tenant and idempotency_key='receipt:'||p_receipt_key and source_type='purchase_order_line' and source_id=p_line::text and product_id=v_line.product_id and location_id=p_location and quantity_delta=p_qty;
 if v_movement is null then raise exception 'Receipt stock movement missing; transaction rolled back';end if;
 insert into business_software_inventory_cost_layers(tenant_id,product_id,location_id,receipt_movement_id,source_type,source_id,quantity_received,quantity_remaining,unit_cost_net)
 values(p_tenant,v_line.product_id,p_location,v_movement,'purchase_receipt',v_movement::text,p_qty,p_qty,v_line.unit_cost_net);
 update business_software_purchase_order_lines set received_quantity=received_quantity+p_qty where id=p_line and tenant_id=p_tenant;
 return true;
end $$;
