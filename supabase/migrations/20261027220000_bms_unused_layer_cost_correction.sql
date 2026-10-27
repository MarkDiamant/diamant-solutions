-- Audit-approved correction of an unconsumed FIFO layer. Consumed layers cannot be repriced.
create or replace function public.bms_inventory_correct_unused_layer_cost(p_tenant uuid,p_layer uuid,p_new_unit_cost numeric,p_key text,p_evidence text,p_reason text,p_approved_by text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_layer record;v_existing record;
begin
 if p_new_unit_cost is null or p_new_unit_cost<0 then raise exception 'Nonnegative verified replacement cost required';end if;
 if length(trim(coalesce(p_key,'')))<8 or length(trim(coalesce(p_evidence,'')))<8 or length(trim(coalesce(p_reason,'')))<8 or length(trim(coalesce(p_approved_by,'')))<3 then raise exception 'Correction key, evidence, reason and approver required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':layer-correction:'||p_layer::text,0));
 select * into v_existing from public.business_software_inventory_cost_adjustments where tenant_id=p_tenant and adjustment_key=p_key;
 if found then
  if v_existing.layer_id<>p_layer or v_existing.new_unit_cost_net<>p_new_unit_cost or v_existing.evidence_reference<>p_evidence then raise exception 'Correction key reused with different payload';end if;
  return false;
 end if;
 select * into v_layer from public.business_software_inventory_cost_layers where tenant_id=p_tenant and id=p_layer for update;
 if not found then raise exception 'Tenant-owned cost layer not found';end if;
 if v_layer.quantity_remaining<>v_layer.quantity_received or exists(select 1 from public.business_software_inventory_cost_allocations where tenant_id=p_tenant and cost_layer_id=p_layer) then raise exception 'Allocated or partially consumed layer cannot be silently repriced; use documented reversal workflow';end if;
 if v_layer.unit_cost_net=p_new_unit_cost then raise exception 'Cost unchanged';end if;
 update public.business_software_inventory_cost_layers set unit_cost_net=p_new_unit_cost where tenant_id=p_tenant and id=p_layer;
 insert into public.business_software_inventory_cost_adjustments(tenant_id,layer_id,adjustment_key,adjustment_type,old_unit_cost_net,new_unit_cost_net,quantity,evidence_reference,reason,approved_by) values(p_tenant,p_layer,p_key,'cost_correction',v_layer.unit_cost_net,p_new_unit_cost,v_layer.quantity_remaining,p_evidence,p_reason,p_approved_by);
 return true;
end $$;
revoke all on function public.bms_inventory_correct_unused_layer_cost(uuid,uuid,numeric,text,text,text,text) from public,anon,authenticated;
grant execute on function public.bms_inventory_correct_unused_layer_cost(uuid,uuid,numeric,text,text,text,text) to service_role;
