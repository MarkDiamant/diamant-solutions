-- Atomic job consumption with immutable cost snapshot, based on recorded receipt cost.
create table if not exists public.business_software_job_stock_consumption (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 job_id uuid not null references public.business_software_jobs(id),
 product_id uuid not null references public.business_software_price_book_items(id),
 location_id uuid not null references public.business_software_stock_locations(id),
 quantity numeric not null check(quantity>0),
 unit_cost_net numeric not null check(unit_cost_net>=0),
 total_cost_net numeric generated always as (quantity*unit_cost_net) stored,
 idempotency_key text not null,
 created_at timestamptz not null default now(),
 unique(tenant_id,idempotency_key)
);
create index if not exists bms_job_consumption_job_idx on public.business_software_job_stock_consumption(tenant_id,job_id,created_at desc);
alter table public.business_software_job_stock_consumption enable row level security;
revoke all on public.business_software_job_stock_consumption from anon,authenticated;
grant select,insert on public.business_software_job_stock_consumption to service_role;

create or replace function public.bms_consume_job_stock(p_tenant uuid,p_job uuid,p_product uuid,p_location uuid,p_qty numeric,p_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_cost numeric; v_existing record; v_changed boolean;
begin
 if p_qty is null or p_qty<=0 or p_qty>1000000 or p_key is null or length(trim(p_key))<8 then raise exception 'Invalid consumption request'; end if;
 if not exists(select 1 from public.business_software_jobs where id=p_job and tenant_id=p_tenant)
 or not exists(select 1 from public.business_software_price_book_items where id=p_product and tenant_id=p_tenant and stock_controlled=true)
 or not exists(select 1 from public.business_software_stock_locations where id=p_location and tenant_id=p_tenant and active=true) then raise exception 'Job, stock product or location unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':consume:'||p_key,0));
 select * into v_existing from public.business_software_job_stock_consumption where tenant_id=p_tenant and idempotency_key=p_key;
 if found then
  if v_existing.job_id<>p_job or v_existing.product_id<>p_product or v_existing.location_id<>p_location or v_existing.quantity<>p_qty then raise exception 'Consumption key reused with different request'; end if;
  return jsonb_build_object('created',false,'cost_net',v_existing.total_cost_net);
 end if;
 -- Receipt-weighted unit cost at this stock location. Never infer a job cost from an unreceived order.
 select sum(m.quantity_delta*l.unit_cost_net)/nullif(sum(m.quantity_delta),0) into v_cost
 from public.business_software_stock_movements m
 join public.business_software_purchase_order_lines l on l.id::text=m.source_id and l.tenant_id=m.tenant_id
 where m.tenant_id=p_tenant and m.product_id=p_product and m.location_id=p_location and m.source_type='purchase_order_line' and m.quantity_delta>0;
 if v_cost is null then raise exception 'No documented purchase receipt cost for this stock location'; end if;
 v_changed:=public.bms_apply_stock_movement(p_tenant,p_product,p_location,-p_qty,'Material consumed on job','job_consumption',p_job::text,'job-consume:'||p_key);
 if not v_changed then raise exception 'Consumption movement already exists without a matching ledger entry'; end if;
 insert into public.business_software_job_stock_consumption(tenant_id,job_id,product_id,location_id,quantity,unit_cost_net,idempotency_key)
 values(p_tenant,p_job,p_product,p_location,p_qty,round(v_cost,4),p_key);
 return jsonb_build_object('created',true,'cost_net',round(p_qty*round(v_cost,4),2),'unit_cost_net',round(v_cost,4));
end $$;
revoke all on function public.bms_consume_job_stock(uuid,uuid,uuid,uuid,numeric,text) from public,anon,authenticated;
grant execute on function public.bms_consume_job_stock(uuid,uuid,uuid,uuid,numeric,text) to service_role;
