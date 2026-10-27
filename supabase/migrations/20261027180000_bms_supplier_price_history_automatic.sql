-- Immutable price observations for supplier-linked Price Book changes and purchase-order line prices.
create or replace function public.bms_record_supplier_price_change() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.supplier_id is not null and new.cost_net is not null
 and (tg_op='INSERT' or old.cost_net is distinct from new.cost_net or old.supplier_id is distinct from new.supplier_id) then
  if exists(select 1 from public.business_software_suppliers s where s.id=new.supplier_id and s.tenant_id=new.tenant_id) then
   insert into public.business_software_supplier_price_history(tenant_id,supplier_id,product_id,unit_cost_net,purchase_unit,notes)
   values(new.tenant_id,new.supplier_id,new.id,new.cost_net,new.purchase_unit,'Price Book supplier cost');
  end if;
 end if;
 return new;
end $$;
drop trigger if exists bms_price_history_on_item on public.business_software_price_book_items;
create trigger bms_price_history_on_item after insert or update of cost_net,supplier_id on public.business_software_price_book_items
for each row execute function public.bms_record_supplier_price_change();

create or replace function public.bms_record_order_line_price() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_supplier uuid;
begin
 select supplier_id into v_supplier from public.business_software_material_orders where id=new.material_order_id and tenant_id=new.tenant_id;
 if v_supplier is not null and new.product_id is not null and new.unit_cost_net is not null
 and (tg_op='INSERT' or old.unit_cost_net is distinct from new.unit_cost_net) then
  insert into public.business_software_supplier_price_history(tenant_id,supplier_id,product_id,unit_cost_net,purchase_unit,notes)
  values(new.tenant_id,v_supplier,new.product_id,new.unit_cost_net,new.unit,'Purchase order supplier price');
 end if;
 return new;
end $$;
drop trigger if exists bms_price_history_on_purchase_line on public.business_software_purchase_order_lines;
create trigger bms_price_history_on_purchase_line after insert or update of unit_cost_net on public.business_software_purchase_order_lines
for each row execute function public.bms_record_order_line_price();
