-- Job follow-up "Done": record that it was done and require an explicit next step.
-- Atomic: job update + audit row in one transaction. Tenant-scoped. Called by the server only.
create or replace function public.bms_complete_job_followup(
  p_tenant uuid, p_job uuid, p_next_at timestamptz default null, p_status text default null, p_actor text default null)
returns jsonb language plpgsql security invoker set search_path to 'public','pg_temp' as $$
declare j public.business_software_jobs%rowtype; v_new public.business_software_jobs%rowtype;
  v_allowed text[]:=array['awaiting_customer','awaiting_information','interested_not_ready','pricing_up','estimate_preparing','quote_preparing','quote_sent','site_visit_required','site_visit_booked','confirmed','deposit_requested','in_progress','on_hold'];
begin
  if p_tenant is null or p_job is null then raise exception 'Job and tenant required' using errcode='22023'; end if;
  if p_next_at is null and p_status is null then raise exception 'Choose the next follow-up date or a stage' using errcode='22023'; end if;
  select * into j from public.business_software_jobs where id=p_job and tenant_id=p_tenant for update;
  if not found then raise exception 'Job not found' using errcode='P0002'; end if;
  if j.archived_at is not null or lower(coalesce(j.status,'')) not in (select unnest(v_allowed)) then
    raise exception 'This job has no active follow-up' using errcode='22023'; end if;
  if p_status is not null and (p_status<>all(v_allowed) or p_status is not distinct from j.status) then
    raise exception 'Choose a different valid stage' using errcode='22023'; end if;
  if p_next_at is not null and p_next_at<=now() then raise exception 'Next follow-up must be in the future' using errcode='22023'; end if;
  update public.business_software_jobs set
    status=coalesce(p_status,status),
    next_action_at=coalesce(p_next_at,next_action_at),
    updated_at=now()
  where id=p_job and tenant_id=p_tenant returning * into v_new;
  -- when only a stage was chosen, the existing guard trigger sets the standard next step and date for that stage
  insert into public.business_software_audit_events(tenant_id,actor,action,entity_type,entity_id,metadata)
  values(p_tenant,p_actor,'job_followup_done','job',p_job::text,jsonb_build_object(
    'previous_status',j.status,'previous_next_action',j.next_action,'previous_next_action_at',j.next_action_at,
    'new_status',v_new.status,'new_next_action',v_new.next_action,'new_next_action_at',v_new.next_action_at,
    'choice',case when p_status is not null then 'stage' else 'date' end));
  return jsonb_build_object('id',v_new.id,'status',v_new.status,'next_action',v_new.next_action,'next_action_at',v_new.next_action_at);
end $$;
revoke all on function public.bms_complete_job_followup(uuid,uuid,timestamptz,text,text) from public, anon, authenticated;
grant execute on function public.bms_complete_job_followup(uuid,uuid,timestamptz,text,text) to service_role;
