-- Atomic BMS materials operations. Service role only.\nCREATE OR REPLACE FUNCTION public.bms_material_allocate(p_tenant uuid, p_line uuid, p_used numeric, p_stock numeric, p_waste numeric, p_returned numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.bms_material_lines%rowtype; v_total numeric; v_stock_delta numeric;
begin
 if auth.role()<>'service_role' then raise exception 'Service only'; end if;
 if p_used<0 or p_stock<0 or p_waste<0 or p_returned<0 then raise exception 'Negative allocation'; end if;
 select * into v from public.bms_material_lines where tenant_id=p_tenant and id=p_line for update;
 if not found then raise exception 'Line not found'; end if;
 v_total:=p_used+p_stock+p_waste+p_returned;
 if abs(v_total-v.received_qty)>0.00001 then raise exception 'Allocations must equal received quantity'; end if;
 v_stock_delta:=p_stock-v.stock_qty;
 update public.bms_material_lines set used_qty=p_used,stock_qty=p_stock,waste_qty=p_waste,returned_qty=p_returned where tenant_id=p_tenant and id=p_line;
 if p_used<>v.used_qty or p_stock<>v.stock_qty or p_waste<>v.waste_qty or p_returned<>v.returned_qty then
 insert into public.bms_material_allocation_audit(tenant_id,line_id,before_values,after_values)
 values(p_tenant,p_line,jsonb_build_object('used',v.used_qty,'stock',v.stock_qty,'waste',v.waste_qty,'supplier_return',v.returned_qty),jsonb_build_object('used',p_used,'stock',p_stock,'waste',p_waste,'supplier_return',p_returned));
 end if;
 if v_stock_delta<>0 then
 insert into public.bms_material_stock_movements(tenant_id,product_id,order_line_id,job_reference,movement_type,quantity_delta,unit_cost_net,note)
 select p_tenant,v.product_id,p_line,o.reference,'adjustment',v_stock_delta,v.cost_net,'Materials usage allocation'
 from public.bms_material_orders o where o.id=v.order_id and o.tenant_id=p_tenant;
 end if;
 return jsonb_build_object('ok',true,'used',p_used,'stock',p_stock,'waste',p_waste,'supplier_return',p_returned);
end $function$
;

CREATE OR REPLACE FUNCTION public.bms_material_confirm(p_tenant uuid, p_order uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.bms_material_orders%rowtype; n integer;
begin
 if auth.role()<>'service_role' then raise exception 'Service only'; end if;
 select * into v from public.bms_material_orders where tenant_id=p_tenant and id=p_order for update;
 if not found then raise exception 'Order not found'; end if;
 if v.status='ordered' then return jsonb_build_object('ok',true,'already_confirmed',true); end if;
 if v.status<>'draft' then raise exception 'Order cannot be confirmed'; end if;
 select count(*) into n from public.bms_material_lines where tenant_id=p_tenant and order_id=p_order;
 if n=0 then raise exception 'Order has no items'; end if;
 update public.bms_material_lines set status='ordered' where tenant_id=p_tenant and order_id=p_order and status='draft';
 update public.bms_material_orders set status='ordered' where tenant_id=p_tenant and id=p_order;
 return jsonb_build_object('ok',true,'line_count',n);
end $function$
;

CREATE OR REPLACE FUNCTION public.bms_material_receive_once(p_tenant uuid, p_line uuid, p_qty numeric, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.bms_material_lines%rowtype; o public.bms_material_orders%rowtype; old_qty numeric;
begin
 if auth.role()<>'service_role' then raise exception 'Service only'; end if;
 if p_request is null or p_qty<=0 then raise exception 'Invalid receipt'; end if;
 select * into v from public.bms_material_lines where id=p_line and tenant_id=p_tenant for update;
 if not found then raise exception 'Line not found'; end if;
 select quantity into old_qty from public.bms_material_receipt_events where tenant_id=p_tenant and line_id=p_line and request_id=p_request;
 if found then
  if old_qty<>p_qty then raise exception 'Receipt request conflict'; end if;
  return jsonb_build_object('ok',true,'already_recorded',true,'received',v.received_qty);
 end if;
 select * into o from public.bms_material_orders where id=v.order_id and tenant_id=p_tenant for update;
 if not found or o.status not in ('ordered','received') then raise exception 'Order not confirmed'; end if;
 if v.received_qty+p_qty>v.quantity then raise exception 'Cannot receive more than ordered'; end if;
 insert into public.bms_material_receipt_events(tenant_id,line_id,request_id,quantity) values(p_tenant,p_line,p_request,p_qty);
 update public.bms_material_lines set received_qty=received_qty+p_qty,used_qty=used_qty+p_qty,status=case when received_qty+p_qty=quantity then 'received' else 'ordered' end where id=p_line and tenant_id=p_tenant;
 return jsonb_build_object('ok',true,'received',v.received_qty+p_qty);
end $function$
;

CREATE OR REPLACE FUNCTION public.bms_material_update_order_receipt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if new.status='received' and old.status is distinct from new.status then
  update public.bms_material_orders o set status='received'
  where o.id=new.order_id and o.tenant_id=new.tenant_id and o.status='ordered'
  and not exists(select 1 from public.bms_material_lines l where l.order_id=new.order_id and l.tenant_id=new.tenant_id and l.status<>'received');
 end if;
 return new;
end $function$
;
revoke all on function public.bms_material_confirm(uuid,uuid) from public,anon,authenticated;
revoke all on function public.bms_material_receive_once(uuid,uuid,numeric,uuid) from public,anon,authenticated;
revoke all on function public.bms_material_allocate(uuid,uuid,numeric,numeric,numeric,numeric) from public,anon,authenticated;
revoke all on function public.bms_material_update_order_receipt() from public,anon,authenticated;
grant execute on function public.bms_material_confirm(uuid,uuid) to service_role;
grant execute on function public.bms_material_receive_once(uuid,uuid,numeric,uuid) to service_role;
grant execute on function public.bms_material_allocate(uuid,uuid,numeric,numeric,numeric,numeric) to service_role;
drop trigger if exists bms_material_receipt_status on public.bms_material_lines;
create trigger bms_material_receipt_status after update of status on public.bms_material_lines for each row execute function public.bms_material_update_order_receipt();
