-- Purchase orders are created in draft status by bms_create_purchase_order_once, but no
-- transition moved them to ordered, so receiving (which requires ordered/partially_received/
-- received) could never start. This function is the explicit draft -> ordered transition a
-- manager performs after placing the order with the supplier. It is idempotent on an
-- already-ordered order and refuses orders that have moved past ordering.
create or replace function public.bms_mark_purchase_order_ordered(p_tenant uuid, p_order uuid)
returns jsonb
language plpgsql
security invoker
set search_path = 'public'
as $function$
declare
  v record;
begin
  select id, tenant_id, status, ordered_at into v
  from public.business_software_material_orders
  where id = p_order and tenant_id = p_tenant;
  if not found then
    raise exception 'purchase order not found' using errcode = '22023';
  end if;
  if v.status = 'ordered' then
    return jsonb_build_object('ok', true, 'already', true, 'status', v.status, 'ordered_at', v.ordered_at);
  end if;
  if v.status <> 'draft' then
    raise exception 'purchase order cannot be marked ordered from status %', v.status using errcode = '22023';
  end if;
  update public.business_software_material_orders
  set status = 'ordered', ordered_at = coalesce(ordered_at, now())
  where id = p_order and tenant_id = p_tenant and status = 'draft'
  returning ordered_at into v.ordered_at;
  return jsonb_build_object('ok', true, 'already', false, 'status', 'ordered', 'ordered_at', v.ordered_at);
end
$function$;
revoke all on function public.bms_mark_purchase_order_ordered(uuid,uuid) from public,anon,authenticated;
grant execute on function public.bms_mark_purchase_order_ordered(uuid,uuid) to service_role;
