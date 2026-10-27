-- Evidence-backed cost opening for already-recorded stock. Never increases physical stock.
create table if not exists public.business_software_inventory_cost_adjustments(id uuid primary key default gen_random_uuid(),tenant_id uuid not null,layer_id uuid not null references public.business_software_inventory_cost_layers(id) on delete restrict,adjustment_key text not null,adjustment_type text not null check(adjustment_type in ('verified_opening','cost_correction')),old_unit_cost_net numeric,new_unit_cost_net numeric not null check(new_unit_cost_net>=0),quantity numeric not null check(quantity>0),evidence_reference text not null check(length(trim(evidence_reference))>=8),reason text not null check(length(trim(reason))>=8),approved_by text not null check(length(trim(approved_by))>=3),created_at timestamptz not null default now(),unique(tenant_id,adjustment_key));
alter table public.business_software_inventory_cost_adjustments enable row level security;
revoke all on public.business_software_inventory_cost_adjustments from anon,authenticated;
create or replace function public.bms_inventory_verified_opening(p_tenant uuid,p_product uuid,p_location uuid,p_quantity numeric,p_unit_cost numeric,p_key text,p_evidence text,p_reason text,p_approved_by text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_layer uuid;v_physical numeric;v_costed numeric;v_existing record;
begin
 if p_quantity is null or p_quantity<=0 or p_unit_cost is null or p_unit_cost<0 then raise exception 'Positive opening quantity and evidenced nonnegative cost required';end if;
 if length(trim(coalesce(p_key,'')))<8 or length(trim(coalesce(p_evidence,'')))<8 or length(trim(coalesce(p_reason,'')))<8 or length(trim(coalesce(p_approved_by,'')))<3 then raise exception 'Idempotency key, evidence, reason and approver required';end if;
 if not exists(select 1 from public.business_software_price_book_items where tenant_id=p_tenant and id=p_product and stock_controlled=true) or not exists(select 1 from public.business_software_stock_locations where tenant_id=p_tenant and id=p_location) then raise exception 'Tenant-owned stock product and location required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':inventory-opening:'||p_product::text||':'||p_location::text,0));
 select a.*,l.product_id,l.location_id into v_existing from public.business_software_inventory_cost_adjustments a join public.business_software_inventory_cost_layers l on l.id=a.layer_id where a.tenant_id=p_tenant and a.adjustment_key=p_key;
 if found then
  if v_existing.product_id<>p_product or v_existing.location_id<>p_location or v_existing.quantity<>p_quantity or v_existing.new_unit_cost_net<>p_unit_cost or v_existing.evidence_reference<>p_evidence then raise exception 'Opening key reused with different evidence or amount';end if;
  return v_existing.layer_id;
 end if;
 select coalesce(sum(quantity_delta),0) into v_physical from public.business_software_stock_movements where tenant_id=p_tenant and product_id=p_product and location_id=p_location;
 select coalesce(sum(quantity_remaining),0) into v_costed from public.business_software_inventory_cost_layers where tenant_id=p_tenant and product_id=p_product and location_id=p_location;
 if v_physical-v_costed<p_quantity then raise exception 'Opening valuation exceeds physically recorded uncosted stock';end if;
 insert into public.business_software_inventory_cost_layers(tenant_id,product_id,location_id,source_type,source_id,quantity_received,quantity_remaining,unit_cost_net) values(p_tenant,p_product,p_location,'verified_opening',p_key,p_quantity,p_quantity,p_unit_cost) returning id into v_layer;
 insert into public.business_software_inventory_cost_adjustments(tenant_id,layer_id,adjustment_key,adjustment_type,new_unit_cost_net,quantity,evidence_reference,reason,approved_by) values(p_tenant,v_layer,p_key,'verified_opening',p_unit_cost,p_quantity,p_evidence,p_reason,p_approved_by);
 return v_layer;
end $$;
revoke all on function public.bms_inventory_verified_opening(uuid,uuid,uuid,numeric,numeric,text,text,text,text) from public,anon,authenticated;
grant execute on function public.bms_inventory_verified_opening(uuid,uuid,uuid,numeric,numeric,text,text,text,text) to service_role;
