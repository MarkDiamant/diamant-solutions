-- Job follow-up "Done, no further follow-up needed": an explicit, persisted opt-out.
--
-- Why a column: the bms_ensure_job_next_action trigger refills next_action/next_action_at for every
-- non-terminal job whenever they are cleared, so a plain "set next_action null" can never stick. The
-- opt-out has to be recorded state, and it is deliberately narrow:
--   * it does NOT close the job (status is unchanged);
--   * it does NOT record or imply any payment;
--   * it only stops the current follow-up cycle. The cycle resumes automatically the moment the job's
--     stage changes, or the moment anyone saves a new next action for the job (both below).
alter table public.business_software_jobs
  add column if not exists next_action_paused boolean not null default false;

create or replace function public.bms_ensure_job_next_action()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
declare default_action text; default_due timestamptz;
begin
 if lower(coalesce(new.status,'')) in ('completed','declined','cancelled','canceled','lost','dormant_enquiry') or new.archived_at is not null then
   new.next_action:=null; new.next_action_at:=null; new.next_action_paused:=false; return new;
 end if;
 -- A stage change always resumes the standard follow-up cycle for the new stage.
 if tg_op='UPDATE' and new.status is distinct from old.status then
   new.next_action_paused:=false;
 end if;
 -- Saving a new next action also resumes the cycle, even without a stage change.
 if new.next_action is not null and btrim(new.next_action)<>'' and
    (tg_op='INSERT' or new.next_action is distinct from old.next_action) then
   new.next_action_paused:=false;
 end if;
 -- The explicit opt-out holds the job free of generated follow-ups until one of the resume rules above fires.
 if new.next_action_paused then
   new.next_action:=null; new.next_action_at:=null; return new;
 end if;
 default_action:=case new.status
 when 'awaiting_customer' then 'Follow up customer'
 when 'awaiting_information' then 'Follow up outstanding information'
 when 'interested_not_ready' then 'Check customer readiness'
 when 'pricing_up' then 'Prepare quote'
 when 'estimate_preparing' then 'Prepare estimate'
 when 'quote_preparing' then 'Send quote'
 when 'quote_sent' then 'Follow up quote'
 when 'site_visit_required' then 'Arrange site visit'
 when 'site_visit_booked' then 'Complete site visit'
 when 'confirmed' then 'Confirm deposit and schedule works'
 when 'deposit_requested' then 'Follow up deposit'
 when 'in_progress' then 'Check progress and confirm next step'
 when 'on_hold' then 'Review job on hold'
 else 'Review job and agree next action' end;
 if new.next_action is null or btrim(new.next_action)='' or
    (tg_op='UPDATE' and new.status is distinct from old.status and new.next_action is not distinct from old.next_action) then
    new.next_action:=default_action;
    if tg_op='UPDATE' and new.status is distinct from old.status then new.next_action_at:=null; end if;
 end if;
 if new.next_action_at is null then
    default_due:=(current_date + (case when new.status in ('in_progress','site_visit_required','site_visit_booked','pricing_up','quote_preparing','estimate_preparing') then 1 else 3 end) + time '09:00') at time zone 'Europe/London';
    new.next_action_at:=default_due;
 end if;
 return new;
end
$function$;

-- The RPC gains one trailing defaulted parameter; the previous signature is removed so only this
-- reviewed version remains executable. Behaviour for existing callers is unchanged: a future
-- p_next_at is still required unless p_no_followup is explicitly true, and the two never combine.
drop function if exists public.bms_complete_job_followup(uuid,uuid,timestamptz,text,text);
create or replace function public.bms_complete_job_followup(
  p_tenant uuid, p_job uuid, p_next_at timestamptz default null, p_status text default null, p_actor text default null, p_no_followup boolean default false)
returns jsonb language plpgsql security invoker set search_path to 'public','pg_temp' as $$
declare j public.business_software_jobs%rowtype; v_new public.business_software_jobs%rowtype;
  v_allowed text[]:=array['awaiting_customer','awaiting_information','interested_not_ready','pricing_up','estimate_preparing','quote_preparing','quote_sent','site_visit_required','site_visit_booked','confirmed','deposit_requested','in_progress','on_hold'];
begin
  if p_tenant is null or p_job is null then raise exception 'Job and tenant required' using errcode='22023'; end if;
  if p_no_followup and p_next_at is not null then raise exception 'Choose either a next follow-up date or no further follow-up' using errcode='22023'; end if;
  if p_no_followup and p_status is not null then raise exception 'Choose either a new stage or no further follow-up' using errcode='22023'; end if;
  if not p_no_followup and p_next_at is null then raise exception 'Choose the next follow-up date' using errcode='22023'; end if;
  select * into j from public.business_software_jobs where id=p_job and tenant_id=p_tenant for update;
  if not found then raise exception 'Job not found' using errcode='P0002'; end if;
  if j.archived_at is not null or lower(coalesce(j.status,'')) in ('completed','declined','cancelled','canceled','lost','dormant_enquiry') then
    raise exception 'This job has no active follow-up' using errcode='22023'; end if;
  if p_status is not null and (p_status<>all(v_allowed) or p_status is not distinct from j.status) then
    raise exception 'Choose a different valid stage' using errcode='22023'; end if;
  if p_next_at is not null and p_next_at<=now() then raise exception 'Next follow-up must be in the future' using errcode='22023'; end if;
  -- Stage change first (the guard trigger sets that stage's standard next step text and clears the date),
  -- then the explicitly chosen date is written in the same transaction so no date is ever generated for the user.
  if p_status is not null then
    update public.business_software_jobs set status=p_status,updated_at=now() where id=p_job and tenant_id=p_tenant;
  end if;
  if p_no_followup then
    -- Explicit opt-out only: the job keeps its current stage and every financial field. The trigger
    -- keeps next_action/next_action_at null while next_action_paused holds, and resumes the cycle on
    -- the next stage change or explicitly saved next action.
    update public.business_software_jobs set next_action=null,next_action_at=null,next_action_paused=true,updated_at=now()
    where id=p_job and tenant_id=p_tenant returning * into v_new;
  else
    update public.business_software_jobs set next_action_at=p_next_at,next_action_paused=false,updated_at=now()
    where id=p_job and tenant_id=p_tenant returning * into v_new;
  end if;
  insert into public.business_software_audit_events(tenant_id,actor,action,entity_type,entity_id,metadata)
  values(p_tenant,p_actor,'job_followup_done','job',p_job::text,jsonb_build_object(
    'previous_status',j.status,'previous_next_action',j.next_action,'previous_next_action_at',j.next_action_at,
    'new_status',v_new.status,'new_next_action',v_new.next_action,'new_next_action_at',v_new.next_action_at,
    'choice',case when p_no_followup then 'no_followup' when p_status is not null then 'stage' else 'date' end));
  return jsonb_build_object('id',v_new.id,'status',v_new.status,'next_action',v_new.next_action,'next_action_at',v_new.next_action_at,'next_action_paused',v_new.next_action_paused);
end $$;
revoke all on function public.bms_complete_job_followup(uuid,uuid,timestamptz,text,text,boolean) from public, anon, authenticated;
grant execute on function public.bms_complete_job_followup(uuid,uuid,timestamptz,text,text,boolean) to service_role;
