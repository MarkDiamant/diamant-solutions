-- Each stock receipt movement needs its own cost layer, as in the existing
-- purchase-line receipt function. Keep line/request retry guards unchanged.
CREATE OR REPLACE FUNCTION public.bms_receive_to_inventory(p_tenant uuid, p_line uuid, p_qty numeric, p_request uuid, p_location uuid DEFAULT NULL::uuid, p_job uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_line public.bms_material_lines%rowtype;v_location uuid;v_prior public.bms_material_inventory_receipts%rowtype;v_movement uuid;v_result jsonb;
begin
if auth.role()<>'service_role' then raise exception 'Service only';end if;
if p_qty is null or p_qty<=0 or p_request is null then raise exception 'Invalid receipt';end if;
select * into v_line from public.bms_material_lines where id=p_line and tenant_id=p_tenant for update;
if not found or v_line.product_id is null then raise exception 'Receipt requires a linked Price Book product';end if;
if not exists(select 1 from public.business_software_price_book_items where tenant_id=p_tenant and id=v_line.product_id and stock_controlled=true) then raise exception 'Product must be stock-controlled';end if;
select * into v_prior from public.bms_material_inventory_receipts where tenant_id=p_tenant and line_id=p_line and request_id=p_request;
if found then
if v_prior.quantity<>p_qty or v_prior.location_id is distinct from coalesce(p_location,v_prior.location_id) or v_prior.job_id is distinct from p_job then raise exception 'Receipt request reused with different values';end if;
return jsonb_build_object('ok',true,'already_recorded',true,'location_id',v_prior.location_id);
end if;
v_location:=p_location;
if v_location is null then select id into v_location from public.business_software_stock_locations where tenant_id=p_tenant and active=true order by is_default desc,name,id limit 1;end if;
if v_location is null or not exists(select 1 from public.business_software_stock_locations where id=v_location and tenant_id=p_tenant and active=true) then raise exception 'Set an active stock location before receiving';end if;
if p_job is not null and not exists(select 1 from public.business_software_jobs where tenant_id=p_tenant and id=p_job) then raise exception 'Invalid job';end if;
v_result:=public.bms_material_receive_once(p_tenant,p_line,p_qty,p_request);
if coalesce((v_result->>'already_recorded')::boolean,false) then raise exception 'Legacy receipt already recorded; reconcile before posting to inventory';end if;
perform public.bms_apply_stock_movement(p_tenant,v_line.product_id,v_location,p_qty,'Purchase order received','purchase_receipt',p_line::text,'po-receipt:'||p_request::text);
select id into v_movement from public.business_software_stock_movements where tenant_id=p_tenant and idempotency_key='po-receipt:'||p_request::text;
if v_movement is null then raise exception 'Stock receipt movement missing';end if;
insert into public.business_software_inventory_cost_layers(tenant_id,product_id,location_id,receipt_movement_id,source_type,source_id,quantity_received,quantity_remaining,unit_cost_net)
values(p_tenant,v_line.product_id,v_location,v_movement,'purchase_receipt',v_movement::text,p_qty,p_qty,v_line.cost_net);
insert into public.bms_material_inventory_receipts(tenant_id,line_id,request_id,product_id,location_id,job_id,quantity,unit_cost_net)
values(p_tenant,p_line,p_request,v_line.product_id,v_location,p_job,p_qty,v_line.cost_net);
if p_job is not null then
perform public.bms_consume_job_stock(p_tenant,p_job,v_line.product_id,v_location,p_qty,'direct-po:'||p_request::text);
update public.bms_material_lines set used_qty=used_qty+p_qty where tenant_id=p_tenant and id=p_line;
end if;
return jsonb_build_object('ok',true,'received',p_qty,'location_id',v_location,'job_id',p_job);
end $function$
;
