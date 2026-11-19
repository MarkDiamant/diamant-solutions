-- bms_pick_job_stock: capture definition in-repo and grant service_role EXECUTE.
-- The function existed only out-of-band (no migration tracked it) and its ACL excluded
-- service_role, so the Stock > Job allocations "Issue stock to job" action failed with
-- 42501 (permission denied for function) through the service-key PostgREST path.
-- Definition below is byte-identical to the live production and isolated definitions
-- (pg_get_functiondef, compared 2026-11-19); this migration changes grants ONLY.
-- Fail-closed: never expose to anon/authenticated; the app layer enforces the
-- manage_stock membership gate and derives p_tenant server-side.
CREATE OR REPLACE FUNCTION public.bms_pick_job_stock(p_tenant uuid, p_job uuid, p_product uuid, p_location uuid, p_qty numeric, p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ declare v_reserved numeric; v_result jsonb;begin if p_qty<=0 or p_qty is null or length(coalesce(p_key,''))<8 then raise exception 'Invalid pick quantity';end if;perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':pick:'||p_key,0));if exists(select 1 from public.business_software_job_stock_consumption where tenant_id=p_tenant and idempotency_key=p_key) then return public.bms_consume_job_stock(p_tenant,p_job,p_product,p_location,p_qty,p_key);end if;perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||p_job::text||':'||p_product::text||':'||p_location::text,0));select quantity into v_reserved from public.business_software_job_stock_reservations where tenant_id=p_tenant and job_id=p_job and product_id=p_product and location_id=p_location for update;if coalesce(v_reserved,0)>=p_qty then perform public.bms_reserve_stock(p_tenant,p_product,p_location,-p_qty);update public.business_software_job_stock_reservations set quantity=quantity-p_qty where tenant_id=p_tenant and job_id=p_job and product_id=p_product and location_id=p_location;delete from public.business_software_job_stock_reservations where tenant_id=p_tenant and job_id=p_job and product_id=p_product and location_id=p_location and quantity=0;elsif coalesce(v_reserved,0)>0 then raise exception 'Pick quantity exceeds reservation. Release or adjust reservation first';end if;v_result:=public.bms_consume_job_stock(p_tenant,p_job,p_product,p_location,p_qty,p_key);return v_result;end $function$;
revoke all on function public.bms_pick_job_stock(uuid,uuid,uuid,uuid,numeric,text) from anon, authenticated;
grant execute on function public.bms_pick_job_stock(uuid,uuid,uuid,uuid,numeric,text) to service_role;
