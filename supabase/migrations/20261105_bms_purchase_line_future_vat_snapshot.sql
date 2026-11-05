-- Applied to shared BMS database on 2026-11-05. Preserve NULL snapshots for historical lines.
alter table public.business_software_purchase_order_lines
 add column if not exists vat_rate_snapshot numeric(6,2),
 add column if not exists vat_amount_snapshot numeric(14,2),
 add column if not exists line_total_gross_snapshot numeric(14,2);
create or replace function public.bms_snapshot_purchase_line_vat() returns trigger
language plpgsql set search_path=public,pg_temp as $$
declare rate numeric;
begin
 if tg_op='INSERT' or (tg_op='UPDATE' and new.product_id is distinct from old.product_id) then
  select cost_vat_rate into rate from public.business_software_price_book_items where tenant_id=new.tenant_id and id=new.product_id;
  if rate is null or rate not in (0,5,20) then raise exception 'Valid product VAT rate required for new purchase order lines'; end if;
  new.vat_rate_snapshot:=rate;
 end if;
 if new.vat_rate_snapshot is not null then
  new.vat_amount_snapshot:=round(new.ordered_quantity*new.unit_cost_net*new.vat_rate_snapshot/100,2);
  new.line_total_gross_snapshot:=round(new.ordered_quantity*new.unit_cost_net,2)+new.vat_amount_snapshot;
 end if;
 return new;
end $$;
drop trigger if exists bms_purchase_line_vat_snapshot on public.business_software_purchase_order_lines;
create trigger bms_purchase_line_vat_snapshot before insert or update of product_id,ordered_quantity,unit_cost_net
on public.business_software_purchase_order_lines for each row execute function public.bms_snapshot_purchase_line_vat();
