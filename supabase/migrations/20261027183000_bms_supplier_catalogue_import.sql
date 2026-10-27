-- Reusable tenant-owned supplier catalogue rows, imported without changing product master prices.
create table if not exists public.business_software_supplier_catalogue_items (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 supplier_id uuid not null references public.business_software_suppliers(id),
 product_id uuid references public.business_software_price_book_items(id),
 supplier_sku text not null,
 supplier_description text not null,
 unit text not null default 'each',
 unit_cost_net numeric check(unit_cost_net>=0),
 updated_at timestamptz not null default now(),
 unique(tenant_id,supplier_id,supplier_sku)
);
create index if not exists bms_supplier_catalogue_lookup on public.business_software_supplier_catalogue_items(tenant_id,supplier_id,product_id);
alter table public.business_software_supplier_catalogue_items enable row level security;
revoke all on public.business_software_supplier_catalogue_items from anon,authenticated;
grant select,insert,update on public.business_software_supplier_catalogue_items to service_role;

create or replace function public.bms_import_supplier_catalogue(p_tenant uuid,p_supplier uuid,p_rows jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare r jsonb; n integer:=0; v_product uuid; v_sku text; v_price numeric;
begin
 if not exists(select 1 from public.business_software_suppliers where tenant_id=p_tenant and id=p_supplier and active=true) then raise exception 'Supplier not found'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 500 then raise exception 'Catalogue must contain 1 to 500 rows'; end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  v_sku:=left(trim(coalesce(r->>'supplier_sku','')),120);
  v_product:=nullif(r->>'product_id','')::uuid;
  v_price:=nullif(r->>'unit_cost_net','')::numeric;
  if v_sku='' or length(trim(coalesce(r->>'description','')))=0 or v_price is null or v_price<0 or v_price>100000000 then raise exception 'Invalid catalogue row'; end if;
  if v_product is not null and not exists(select 1 from public.business_software_price_book_items where tenant_id=p_tenant and id=v_product) then raise exception 'Product belongs to another tenant or is missing'; end if;
  insert into public.business_software_supplier_catalogue_items(tenant_id,supplier_id,product_id,supplier_sku,supplier_description,unit,unit_cost_net)
  values(p_tenant,p_supplier,v_product,v_sku,left(r->>'description',500),left(coalesce(nullif(r->>'unit',''),'each'),50),v_price)
  on conflict(tenant_id,supplier_id,supplier_sku) do update set product_id=excluded.product_id,supplier_description=excluded.supplier_description,unit=excluded.unit,unit_cost_net=excluded.unit_cost_net,updated_at=now();
  if v_product is not null then
   insert into public.business_software_supplier_price_history(tenant_id,supplier_id,product_id,unit_cost_net,purchase_unit,notes)
   values(p_tenant,p_supplier,v_product,v_price,left(coalesce(r->>'unit','each'),50),'Supplier catalogue import');
  end if;
  n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.bms_import_supplier_catalogue(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.bms_import_supplier_catalogue(uuid,uuid,jsonb) to service_role;
