create or replace function public.bms_material_guard_confirmed_lines() returns trigger language plpgsql set search_path=public as $$
declare v_status text;
begin
 if tg_op='INSERT' then
   select status into v_status from public.bms_material_orders where id=new.order_id and tenant_id=new.tenant_id for share;
   if v_status is distinct from 'draft' then raise exception 'Only draft orders accept new lines'; end if;
   return new;
 elsif tg_op='DELETE' then
   select status into v_status from public.bms_material_orders where id=old.order_id and tenant_id=old.tenant_id for share;
   if v_status is distinct from 'draft' then raise exception 'Confirmed order lines cannot be deleted'; end if;
   return old;
 end if;
 select status into v_status from public.bms_material_orders where id=old.order_id and tenant_id=old.tenant_id for share;
 if new.tenant_id is distinct from old.tenant_id or new.order_id is distinct from old.order_id then raise exception 'Order identity cannot change'; end if;
 if v_status<>'draft' and (new.name,new.sku,new.specification,new.supplier,new.link,new.unit,new.quantity,new.cost_net,new.vat_rate,new.product_id) is distinct from (old.name,old.sku,old.specification,old.supplier,old.link,old.unit,old.quantity,old.cost_net,old.vat_rate,old.product_id) then
 raise exception 'Confirmed purchase snapshots cannot be edited';
 end if;
 return new;
end $$;
drop trigger if exists bms_material_guard_lines on public.bms_material_lines;
create trigger bms_material_guard_lines before insert or update or delete on public.bms_material_lines for each row execute function public.bms_material_guard_confirmed_lines();
revoke all on function public.bms_material_guard_confirmed_lines() from public,anon,authenticated;