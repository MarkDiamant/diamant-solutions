-- Shared BMS. Reject stock movement idempotency key reuse with mismatched payload.
CREATE OR REPLACE FUNCTION public.bms_apply_stock_movement(p_tenant uuid, p_product uuid, p_location uuid, p_delta numeric, p_reason text, p_source_type text, p_source_id text, p_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare existing uuid; begin
 if p_delta=0 or p_key is null or length(trim(p_key))=0 then raise exception 'Invalid movement';end if;
 if not exists(select 1 from public.business_software_price_book_items where id=p_product and tenant_id=p_tenant)
 or not exists(select 1 from public.business_software_stock_locations where id=p_location and tenant_id=p_tenant)
 then raise exception 'Product or location does not belong to tenant';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||p_key,0));
 select id into existing from public.business_software_stock_movements where tenant_id=p_tenant and idempotency_key=p_key;
 if existing is not null then if not exists (select 1 from public.business_software_stock_movements where id=existing and tenant_id=p_tenant and product_id=p_product and location_id=p_location and quantity_delta=p_delta and source_type is not distinct from p_source_type and source_id is not distinct from p_source_id) then raise exception 'Stock idempotency key reused with different movement'; end if; return false;end if;
 insert into public.business_software_stock_balances(tenant_id,product_id,location_id,on_hand)
 values(p_tenant,p_product,p_location,0) on conflict do nothing;
 update public.business_software_stock_balances set on_hand=on_hand+p_delta
 where tenant_id=p_tenant and product_id=p_product and location_id=p_location
 and on_hand+p_delta>=reserved and on_hand+p_delta>=0;
 if not found then raise exception 'Insufficient unreserved stock';end if;
 insert into public.business_software_stock_movements(tenant_id,product_id,location_id,quantity_delta,reason,source_type,source_id,idempotency_key)
 values(p_tenant,p_product,p_location,p_delta,p_reason,p_source_type,p_source_id,p_key);
 return true;
end $function$
;
