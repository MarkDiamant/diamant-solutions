-- Behaviour test for bms_complete_job_followup. Run on the ISOLATED project only (fictional tenant).
-- Everything is rolled back at the end; any failed assertion aborts with an exception.
begin;
do $$
declare t uuid; o uuid; j uuid; r jsonb; n int;
begin
  select id into t from business_software_tenants where slug='test-isolated-bms';
  select id into o from business_software_tenants where id<>t order by created_at limit 1;
  select id into j from business_software_jobs where tenant_id=t limit 1;
  update business_software_jobs set status='awaiting_customer',next_action='Follow up customer',next_action_at=now()-interval '2 days' where id=j;
  begin perform bms_complete_job_followup(t,j,null,null,'t'); raise exception 'FAIL neither'; exception when sqlstate '22023' then null; end;
  begin perform bms_complete_job_followup(t,j,now()-interval '1 day',null,'t'); raise exception 'FAIL past'; exception when sqlstate '22023' then null; end;
  begin perform bms_complete_job_followup(o,j,now()+interval '3 days',null,'t'); raise exception 'FAIL cross-tenant'; exception when sqlstate 'P0002' then null; end;
  begin perform bms_complete_job_followup(t,j,null,'lost','t'); raise exception 'FAIL bad stage'; exception when sqlstate '22023' then null; end;
  begin perform bms_complete_job_followup(t,j,null,'awaiting_customer','t'); raise exception 'FAIL same stage'; exception when sqlstate '22023' then null; end;
  select count(*) into n from business_software_audit_events where entity_id=j::text and action='job_followup_done'; if n<>0 then raise exception 'FAIL audit written on failure'; end if;
  r:=bms_complete_job_followup(t,j,now()+interval '5 days',null,'t');
  if r->>'status'<>'awaiting_customer' or r->>'next_action'<>'Follow up customer' or (r->>'next_action_at')::timestamptz<=now() then raise exception 'FAIL date path %',r; end if;
  r:=bms_complete_job_followup(t,j,null,'quote_sent','t');
  if r->>'status'<>'quote_sent' or r->>'next_action'<>'Follow up quote' then raise exception 'FAIL stage path %',r; end if;
  select count(*) into n from business_software_audit_events where entity_id=j::text and action='job_followup_done'; if n<>2 then raise exception 'FAIL audit count %',n; end if;
  if has_function_privilege('anon','public.bms_complete_job_followup(uuid,uuid,timestamptz,text,text)','execute') then raise exception 'FAIL anon can execute'; end if;
  raise notice 'job follow-up done: all assertions passed';
end $$;
rollback;
