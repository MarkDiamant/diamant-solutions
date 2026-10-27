-- Shared, tenant-scoped FIFO inventory accounting ledger. Existing stock is not backfilled at guessed costs.
create table if not exists public.business_software_inventory_cost_layers(id uuid primary key default gen_random_uuid(),tenant_id uuid not null,product_id uuid not null,location_id uuid not null,receipt_movement_id uuid references public.business_software_stock_movements(id) on delete restrict,source_type text not null,source_id text not null,quantity_received numeric not null check(quantity_received>0),quantity_remaining numeric not null check(quantity_remaining>=0 and quantity_remaining<=quantity_received),unit_cost_net numeric not null check(unit_cost_net>=0),currency text not null default 'GBP',received_at timestamptz not null default now(),created_at timestamptz not null default now(),unique(tenant_id,source_type,source_id,product_id,location_id));
create index if not exists bms_inventory_layers_fifo on public.business_software_inventory_cost_layers(tenant_id,product_id,location_id,received_at,id) where quantity_remaining>0;
create table if not exists public.business_software_inventory_cost_allocations(id uuid primary key default gen_random_uuid(),tenant_id uuid not null,cost_layer_id uuid not null references public.business_software_inventory_cost_layers(id) on delete restrict,stock_movement_id uuid references public.business_software_stock_movements(id) on delete restrict,job_consumption_id uuid references public.business_software_job_stock_consumption(id) on delete restrict,quantity numeric not null check(quantity>0),unit_cost_net numeric not null check(unit_cost_net>=0),total_cost_net numeric generated always as(quantity*unit_cost_net) stored,allocated_at timestamptz not null default now(),actor text not null,reason text not null,unique(tenant_id,cost_layer_id,stock_movement_id,job_consumption_id));
create index if not exists bms_inventory_allocations_tenant on public.business_software_inventory_cost_allocations(tenant_id,cost_layer_id);
alter table public.business_software_inventory_cost_layers enable row level security;
alter table public.business_software_inventory_cost_allocations enable row level security;
revoke all on public.business_software_inventory_cost_layers,public.business_software_inventory_cost_allocations from anon,authenticated;
create or replace function public.bms_inventory_fifo_allocate(p_tenant uuid,p_product uuid,p_location uuid,p_quantity numeric,p_movement uuid,p_consumption uuid,p_actor text,p_reason text)
returns numeric language plpgsql security definer set search_path=public as $$
declare layer_row record;remaining numeric:=p_quantity;take_qty numeric;total numeric:=0;
begin
 if p_quantity<=0 or p_quantity is null then raise exception 'Positive allocation quantity required';end if;
 if p_movement is null and p_consumption is null then raise exception 'Stock movement or job consumption required';end if;
 if length(trim(coalesce(p_actor,'')))=0 or length(trim(coalesce(p_reason,'')))<3 then raise exception 'Actor and reason required';end if;
 if p_movement is not null and not exists(select 1 from public.business_software_stock_movements where id=p_movement and tenant_id=p_tenant and product_id=p_product and location_id=p_location and quantity_delta<0) then raise exception 'Tenant-scoped outbound movement required';end if;
 if p_consumption is not null and not exists(select 1 from public.business_software_job_stock_consumption where id=p_consumption and tenant_id=p_tenant and product_id=p_product and location_id=p_location) then raise exception 'Tenant-scoped job consumption required';end if;
 if exists(select 1 from public.business_software_inventory_cost_allocations where tenant_id=p_tenant and ((p_movement is not null and stock_movement_id=p_movement) or (p_consumption is not null and job_consumption_id=p_consumption))) then raise exception 'Movement already allocated';end if;
 for layer_row in select * from public.business_software_inventory_cost_layers where tenant_id=p_tenant and product_id=p_product and location_id=p_location and quantity_remaining>0 order by received_at,id for update loop
 take_qty:=least(remaining,layer_row.quantity_remaining);
 update public.business_software_inventory_cost_layers set quantity_remaining=quantity_remaining-take_qty where id=layer_row.id;
 insert into public.business_software_inventory_cost_allocations(tenant_id,cost_layer_id,stock_movement_id,job_consumption_id,quantity,unit_cost_net,actor,reason) values(p_tenant,layer_row.id,p_movement,p_consumption,take_qty,layer_row.unit_cost_net,p_actor,p_reason);
 total:=total+take_qty*layer_row.unit_cost_net;remaining:=remaining-take_qty;
 exit when remaining=0;
 end loop;
 if remaining>0 then raise exception 'Insufficient costed inventory for FIFO allocation; transaction rolled back';end if;
 return total;
end $$;
revoke all on function public.bms_inventory_fifo_allocate(uuid,uuid,uuid,numeric,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.bms_inventory_fifo_allocate(uuid,uuid,uuid,numeric,uuid,uuid,text,text) to service_role;
