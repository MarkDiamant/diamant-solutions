-- Behaviour test for the "no further follow-up needed" opt-out. Run on the ISOLATED project only
-- (fictional tenant), after 20261120140000_bms_job_followup_no_next.sql. Everything rolls back.
begin;
do $$
declare t uuid; o uuid; j uuid; r jsonb; before_job jsonb; after_job jsonb; n int; d timestamptz:=date_trunc('minute',now()+interval '9 days');
begin
  select id into t from business_software_tenants where slug='test-isolated-bms';
  select id into o from business_software_tenants where id<>t order by created_at limit 1;
  select id into j from business_software_jobs where tenant_id=t limit 1;
  update business_software_jobs set status='awaiting_final_payment',next_action='Chase final payment',next_action_at=now()-interval '1 day' where id=j;

  -- Rejection paths: the opt-out never combines with a date or a stage, and a bare completion still needs one of them.
  begin perform bms_complete_job_followup(t,j,d,null,'t',true); raise exception 'FAIL date plus opt-out'; exception when sqlstate '22023' then null; end;
  begin perform bms_complete_job_followup(t,j,null,'quote_sent','t',true); raise exception 'FAIL stage plus opt-out'; exception when sqlstate '22023' then null; end;
  begin perform bms_complete_job_followup(t,j,null,null,'t',false); raise exception 'FAIL no date'; exception when sqlstate '22023' then null; end;
  begin perform bms_complete_job_followup(o,j,null,null,'t',true); raise exception 'FAIL cross-tenant'; exception when sqlstate 'P0002' then null; end;
  select count(*) into n from business_software_audit_events where entity_id=j::text and action='job_followup_done'; if n<>0 then raise exception 'FAIL audit written on failure'; end if;

  -- The opt-out: done is recorded, stage and money untouched, no next action survives the trigger.
  select to_jsonb(x) into before_job from business_software_jobs x where id=j;
  r:=bms_complete_job_followup(t,j,null,null,'t',true);
  select to_jsonb(x) into after_job from business_software_jobs x where id=j;
  if (before_job-'next_action'-'next_action_at'-'next_action_paused'-'updated_at') is distinct from (after_job-'next_action'-'next_action_at'-'next_action_paused'-'updated_at') then raise exception 'FAIL unrelated job or financial state changed';end if;
  if r->>'status'<>'awaiting_final_payment' then raise exception 'FAIL opt-out changed stage %',r; end if;
  if r->>'next_action' is not null or (r->>'next_action_at') is not null then raise exception 'FAIL opt-out left a follow-up %',r; end if;
  if (r->>'next_action_paused')::boolean is not true then raise exception 'FAIL opt-out flag not persisted %',r; end if;
  select count(*) into n from business_software_audit_events where entity_id=j::text and action='job_followup_done' and metadata->>'choice'='no_followup'; if n<>1 then raise exception 'FAIL audit choice %',n; end if;

  -- Unrelated edits do not resurrect a follow-up while paused.
  update business_software_jobs set internal_notes=coalesce(internal_notes,'')||' x' where id=j;
  if (select next_action from business_software_jobs where id=j) is not null then raise exception 'FAIL unrelated edit resurrected follow-up'; end if;

  -- An explicitly saved next action resumes the cycle.
  update business_software_jobs set next_action='Order materials',next_action_at=d where id=j;
  if (select next_action_paused from business_software_jobs where id=j) then raise exception 'FAIL explicit action did not resume'; end if;

  -- A stage change resumes the cycle with the standard stage follow-up.
  perform bms_complete_job_followup(t,j,null,null,'t',true);
  update business_software_jobs set status='quote_sent' where id=j;
  if (select next_action from business_software_jobs where id=j)<>'Follow up quote' then raise exception 'FAIL stage change did not regenerate follow-up'; end if;
  if (select next_action_paused from business_software_jobs where id=j) then raise exception 'FAIL stage change kept pause'; end if;

  -- Terminal stages stay clear and clear the flag.
  update business_software_jobs set status='completed' where id=j;
  if (select next_action from business_software_jobs where id=j) is not null then raise exception 'FAIL terminal kept follow-up'; end if;
  if (select next_action_paused from business_software_jobs where id=j) then raise exception 'FAIL terminal kept pause'; end if;

  -- Privileges: only the reviewed 6-argument signature exists and only service_role can execute it.
  if (select count(*) from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname='bms_complete_job_followup')<>1 then raise exception 'FAIL more than one RPC signature'; end if;
  if has_function_privilege('anon','public.bms_complete_job_followup(uuid,uuid,timestamptz,text,text,boolean)','execute') or has_function_privilege('authenticated','public.bms_complete_job_followup(uuid,uuid,timestamptz,text,text,boolean)','execute') then raise exception 'FAIL anon/authenticated can execute'; end if;
  raise notice 'job follow-up no-next: all assertions passed';
end $$;
rollback;
