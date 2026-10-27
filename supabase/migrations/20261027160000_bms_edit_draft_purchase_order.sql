-- Atomic, tenant-scoped editing of an existing unreceived draft.
create or replace function public.bms_edit_draft_purchase_order(
 p_tenant uuid,p_order uuid,p_supplier uuid,p_job uuid,p_notes text,p_lines jsonb
) returns boolean language plpgsql security definer set search_path=public as $$
declare v_order public.business_software_material_orders%rowtype; v_line jsonb; v_product uuid; v_qty numeric; v_cost numeric; v_description text;
begin
 if p_tenant is null or p_order is null or p_supplier is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Invalid draft purchase order'; end if;
 select * into v_order from public.business_software_material_orders where tenant_id=p_tenant and id=p_order for update;
 if not found or v_order.status<>'draft' then raise exception 'Only draft purchase orders may be edited'; end if;
 if exists(select 1 from public.business_software_purchase_order_lines where tenant_id=p_tenant and material_order_id=p_order and coalesce(received_quantity,0)>0) then raise exception 'Received purchase orders cannot be rewritten'; end if;
 if not exists(select 1 from public.business_software_suppliers where tenant_id=p_tenant and id=p_supplier and active=true) then raise exception 'Supplier not found'; end if;
 if p_job is not null and not exists(select 1 from public.business_software_jobs where tenant_id=p_tenant and id=p_job) then raise exception 'Job not found'; end if;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_product:=(v_line->>'product_id')::uuid;v_qty:=(v_line->>'quantity')::numeric;v_cost:=(v_line->>'unit_cost_net')::numeric;v_description:=left(coalesce(v_line->>'description',''),500);
  if v_qty is null or v_qty<=0 or v_qty>1000000 or v_cost is null or v_cost<0 or v_cost>100000000 or not exists(select 1 from public.business_software_price_book_items where tenant_id=p_tenant and id=v_product and active=true) then raise exception 'Invalid product, quantity or price'; end if;
 end loop;
 delete from public.business_software_purchase_order_lines where tenant_id=p_tenant and material_order_id=p_order;
 insert into public.business_software_purchase_order_lines(tenant_id,material_order_id,product_id,description,ordered_quantity,received_quantity,unit,unit_cost_net)
 select p_tenant,p_order,(x->>'product_id')::uuid,left(coalesce(x->>'description',p.name),500),(x->>'quantity')::numeric,0,coalesce(p.purchase_unit,p.unit),(x->>'unit_cost_net')::numeric
 from jsonb_array_elements(p_lines) x join public.business_software_price_book_items p on p.id=(x->>'product_id')::uuid and p.tenant_id=p_tenant;
 update public.business_software_material_orders set supplier_id=p_supplier,supplier_name=(select name from public.business_software_suppliers where id=p_supplier and tenant_id=p_tenant),job_id=p_job,notes=left(coalesce(p_notes,''),2000),amount=(select sum(ordered_quantity*unit_cost_net) from public.business_software_purchase_order_lines where tenant_id=p_tenant and material_order_id=p_order) where id=p_order and tenant_id=p_tenant;
 return true;
end $$;
revoke all on function public.bms_edit_draft_purchase_order(uuid,uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bms_edit_draft_purchase_order(uuid,uuid,uuid,uuid,text,jsonb) to service_role;
