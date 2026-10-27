-- Atomically consume physical stock and allocate documented FIFO cost layers.
-- Missing historical cost evidence blocks consumption rather than inventing a cost.
create or replace function public.bms_consume_job_stock(p_tenant uuid,p_job uuid,p_product uuid,p_location uuid,p_qty numeric,p_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_cost numeric;v_existing record;v_changed boolean;v_movement uuid;v_consumption uuid;
begin
 if p_qty is null or p_qty<=0 or p_qty>1000000 or p_key is null or length(trim(p_key))<8 then raise exception 'Invalid consumption request';end if;
 if not exists(select 1 from public.business_software_jobs where id=p_job and tenant_id=p_tenant)
 or not exists(select 1 from public.business_software_price_book_items where id=p_product and tenant_id=p_tenant and stock_controlled=true)
 or not exists(select 1 from public.business_software_stock_locations where id=p_location and tenant_id=p_tenant and active=true) then raise exception 'Job, stock product or location unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':consume:'||p_key,0));
 select * into v_existing from public.business_software_job_stock_consumption where tenant_id=p_tenant and idempotency_key=p_key;
 if found then
  if v_existing.job_id<>p_job or v_existing.product_id<>p_product or v_existing.location_id<>p_location or v_existing.quantity<>p_qty then raise exception 'Consumption key reused with different request';end if;
  return jsonb_build_object('created',false,'cost_net',v_existing.total_cost_net);
 end if;
 if (select coalesce(sum(quantity_remaining),0) from public.business_software_inventory_cost_layers where tenant_id=p_tenant and product_id=p_product and location_id=p_location)<p_qty then raise exception 'Insufficient verified FIFO cost layers; establish evidenced opening valuation first';end if;
 v_changed:=public.bms_apply_stock_movement(p_tenant,p_product,p_location,-p_qty,'Material consumed on job','job_consumption',p_job::text,'job-consume:'||p_key);
 if not v_changed then raise exception 'Consumption movement already exists without matching ledger entry';end if;
 select id into v_movement from public.business_software_stock_movements where tenant_id=p_tenant and idempotency_key='job-consume:'||p_key and product_id=p_product and location_id=p_location and quantity_delta=-p_qty;
 if v_movement is null then raise exception 'Consumption movement not found';end if;
 v_cost:=public.bms_inventory_fifo_allocate(p_tenant,p_product,p_location,p_qty,v_movement,null,'system:job-consumption','Job material consumed: '||p_key);
 insert into public.business_software_job_stock_consumption(tenant_id,job_id,product_id,location_id,quantity,unit_cost_net,idempotency_key)
 values(p_tenant,p_job,p_product,p_location,p_qty,v_cost/p_qty,p_key) returning id into v_consumption;
 update public.business_software_inventory_cost_allocations set job_consumption_id=v_consumption where tenant_id=p_tenant and stock_movement_id=v_movement;
 return jsonb_build_object('created',true,'cost_net',v_cost,'unit_cost_net',v_cost/p_qty,'allocation_id',v_consumption);
end $$;
revoke all on function public.bms_consume_job_stock(uuid,uuid,uuid,uuid,numeric,text) from public,anon,authenticated;
grant execute on function public.bms_consume_job_stock(uuid,uuid,uuid,uuid,numeric,text) to service_role;
