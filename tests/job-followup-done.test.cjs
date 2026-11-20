const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {DONE_STAGES,parseDoneRequest,verifyDoneResponse}=require('../business-software-core/lib/job-followup.cjs');
const route=fs.readFileSync('app/api/business-software/tasks/route.ts','utf8');
const panel=fs.readFileSync('business-software-core/components/admin/TasksPanel.tsx','utf8');
const mig=fs.readFileSync('supabase/migrations/20261119150000_bms_complete_job_followup.sql','utf8');
const NOW=Date.parse('2026-11-19T15:00:00Z'),DAY=864e5;
const iso=d=>new Date(NOW+d*DAY).toISOString();
const okBody=(over={})=>({ok:true,done:true,job:{status:'awaiting_customer',next_action:'Follow up customer',next_action_at:iso(3),...over}});
test('parse: a future date is always required; nothing is defaulted',()=>{
 assert.equal(parseDoneRequest({},NOW).ok,false);
 assert.equal(parseDoneRequest({next_at:'not a date'},NOW).ok,false);
 assert.equal(parseDoneRequest({next_at:iso(-1)},NOW).ok,false);
 assert.equal(parseDoneRequest({next_at:iso(0)},NOW).ok,false);
 const r=parseDoneRequest({next_at:iso(3)},NOW);assert.equal(r.ok,true);assert.equal(r.newStatus,null);
});
test('parse: only the 13 existing active stages are accepted; closing stages are not',()=>{
 assert.equal(DONE_STAGES.length,13);
 for(const [k] of DONE_STAGES)assert.equal(parseDoneRequest({next_at:iso(2),new_status:k},NOW).ok,true);
 for(const bad of ['lost','declined','cancelled','completed','dormant_enquiry','nonsense'])assert.equal(parseDoneRequest({next_at:iso(2),new_status:bad},NOW).ok,false,bad);
});
test('every stage action text matches the database default table',()=>{
 const m=require('node:fs').readFileSync('supabase/migrations/20261119150000_bms_complete_job_followup.sql','utf8');
 assert.ok(m.includes('Stage change first'));
 const expected={awaiting_customer:'Follow up customer',quote_sent:'Follow up quote',in_progress:'Check progress and confirm next step',on_hold:'Review job on hold',confirmed:'Confirm deposit and schedule works'};
 for(const [k,,a] of DONE_STAGES)if(expected[k])assert.equal(a,expected[k]);
});
test('verify: accepts only a persisted job with the requested future date',()=>{
 const req={next_at:iso(3)};
 assert.equal(verifyDoneResponse(req,okBody(),NOW).ok,true);
 assert.equal(verifyDoneResponse(req,null,NOW).ok,false,'unexpected response');
 assert.equal(verifyDoneResponse(req,{ok:true,job:okBody().job},NOW).ok,false,'missing done flag');
 assert.equal(verifyDoneResponse(req,{ok:true,done:true},NOW).ok,false,'no job');
 assert.equal(verifyDoneResponse(req,okBody({next_action:null}),NOW).ok,false,'no next action');
 assert.equal(verifyDoneResponse(req,okBody({next_action_at:iso(-1)}),NOW).ok,false,'stale date in past');
 assert.equal(verifyDoneResponse(req,okBody({next_action_at:iso(5)}),NOW).ok,false,'different date than requested (stale read or trigger default)');
 assert.equal(verifyDoneResponse(req,{ok:false,error:'x'},NOW).ok,false,'failed write');
});
test('verify: stage change must persist the chosen stage and its standard action',()=>{
 const req={next_at:iso(4),new_status:'quote_sent'};
 const good={ok:true,done:true,job:{status:'quote_sent',next_action:'Follow up quote',next_action_at:iso(4)}};
 assert.equal(verifyDoneResponse(req,good,NOW).ok,true);
 assert.equal(verifyDoneResponse(req,{...good,job:{...good.job,status:'awaiting_customer'}},NOW).ok,false);
 assert.equal(verifyDoneResponse(req,{...good,job:{...good.job,next_action:'Something else'}},NOW).ok,false);
 assert.equal(verifyDoneResponse(req,{...good,job:{...good.job,next_action_at:iso(3)}},NOW).ok,false,'trigger-generated date must not pass');
});
test('route: validates with the shared parser and uses one atomic tenant-scoped RPC; no auto-advance',()=>{
 const seg=route.slice(route.indexOf('if(b.status!=="completed")return NextResponse.json({error:"This job next action'));
 const job=seg.slice(0,seg.indexOf('const current=await fullTask'));
 assert.match(job,/parseDoneRequest\(b\)/);
 assert.match(job,/rpc\/bms_complete_job_followup/);
 assert.match(job,/p_tenant:c\.tenant\.id/);
 assert.doesNotMatch(job,/nextJobStep\(/);
 assert.doesNotMatch(job,/next_action:null/);
});
test('migration: row lock, tenant scope, explicit date written after stage, audit in same function, service_role only',()=>{
 assert.match(mig,/for update/);
 assert.match(mig,/where id=p_job and tenant_id=p_tenant/);
 assert.match(mig,/insert into public\.business_software_audit_events/);
 assert.match(mig,/Choose the next follow-up date/);
 assert.match(mig,/revoke all on function[^;]*from public, anon, authenticated/);
 assert.match(mig,/grant execute on function[^;]*to service_role/);
});
test('panel: dialog requires a date, shows stage effect, verifies via shared module and reloads after failure',()=>{
 assert.match(panel,/aria-label="Complete follow-up"/);
 assert.match(panel,/the stage and the date are both saved/);
 assert.doesNotMatch(panel,/Nothing else changes/);
 assert.match(panel,/Unable to confirm update: We couldn't confirm whether this saved/);
 assert.match(panel,/The list could not be refreshed/);
 assert.match(panel,/Next follow-up date\{doneFor\.noFollowup/);
 assert.match(panel,/No further follow-up needed/);
 assert.match(panel,/verifyDoneResponse\(p,b\)/);
 assert.match(panel,/reloaded=await load\(\)/);
 assert.match(panel,/"⚠ Unable to confirm update"/);
 assert.doesNotMatch(panel,/The job follow-up was not completed/);
 assert.match(panel,/disabled=\{\(!doneFor\.noFollowup&&!doneFor\.at\)\|\|updating===doneFor\.id\}/);
 assert.match(panel,/if\(updating===id\)return;setDoneFor/);
});

const noNextMig=fs.readFileSync('supabase/migrations/20261120140000_bms_job_followup_no_next.sql','utf8');
test('parse: no_followup is explicit and never combines with a date or a stage',()=>{
 const r=parseDoneRequest({no_followup:true},NOW);
 assert.equal(parseDoneRequest({no_followup:'false'},NOW).ok,false,'string must not silently pause followups');assert.equal(r.ok,true);assert.equal(r.noFollowup,true);assert.equal(r.nextAt,null);assert.equal(r.newStatus,null);
 assert.equal(parseDoneRequest({no_followup:true,next_at:iso(3)},NOW).ok,false,'date plus opt-out must be rejected');
 assert.equal(parseDoneRequest({no_followup:true,new_status:'quote_sent'},NOW).ok,false,'stage plus opt-out must be rejected');
 assert.equal(parseDoneRequest({},NOW).ok,false,'a bare completion still requires a date');
});
test('verify: no_followup accepts only a persisted job with no next action and no date',()=>{
 const req={no_followup:true};
 const good={ok:true,done:true,job:{status:'awaiting_final_payment',next_action:null,next_action_at:null,next_action_paused:true}};
 const v=verifyDoneResponse(req,good,NOW);assert.equal(v.ok,true);assert.equal(v.noFollowup,true);
 assert.equal(verifyDoneResponse(req,{...good,job:{...good.job,next_action:'Chase final payment'}},NOW).ok,false,'refilled action means the opt-out did not stick');
 assert.equal(verifyDoneResponse(req,{...good,job:{...good.job,next_action_at:iso(3)}},NOW).ok,false,'refilled date means the opt-out did not stick');
 assert.equal(verifyDoneResponse(req,{...good,job:{...good.job,next_action_paused:false}},NOW).ok,false,'flag must be the persisted true');
 assert.equal(verifyDoneResponse(req,{ok:true,done:true,job:{next_action:null,next_action_at:null}},NOW).ok,false,'missing persisted flag fails closed');
 assert.equal(verifyDoneResponse({next_at:iso(3)},okBody({next_action:null}),NOW).ok,false,'date flow still rejects a missing action');
});
test('route: forwards the explicit opt-out to the same atomic tenant-scoped RPC',()=>{
 assert.match(route,/p_no_followup:!!parsed\.noFollowup/);
 assert.match(route,/rpc\/bms_complete_job_followup/);
});
test('no-next migration: persisted flag, trigger resume rules, single reviewed RPC signature, audited choice',()=>{
 assert.match(noNextMig,/add column if not exists next_action_paused boolean not null default false/);
 assert.match(noNextMig,/new\.status is distinct from old\.status then\s*new\.next_action_paused:=false/,'stage change resumes follow-ups');
 assert.match(noNextMig,/new\.next_action is not null and btrim\(new\.next_action\)<>''/,'explicit next action resumes follow-ups');
 assert.match(noNextMig,/if new\.next_action_paused then\s*new\.next_action:=null; new\.next_action_at:=null; return new;/,'paused jobs get no generated follow-up');
 assert.match(noNextMig,/drop function if exists public\.bms_complete_job_followup\(uuid,uuid,timestamptz,text,text\)/);
 assert.match(noNextMig,/p_no_followup boolean default false/);
 assert.match(noNextMig,/'no_followup'/,'audit choice recorded');
 assert.match(noNextMig,/grant execute on function public\.bms_complete_job_followup\(uuid,uuid,timestamptz,text,text,boolean\) to service_role/);
 assert.match(noNextMig,/revoke all on function[^;]*from public, anon, authenticated/);
 assert.match(noNextMig,/update public\.business_software_jobs set next_action=null,next_action_at=null,next_action_paused=true,updated_at=now\(\)/,'opt-out update touches only the follow-up fields');
 assert.doesNotMatch(noNextMig,/set status='(completed|declined|cancelled|canceled|lost|dormant_enquiry)'/,'migration never moves a job to a terminal stage');
});
test('panel: completion actions are labelled Done for every task type',()=>{
 assert.doesNotMatch(panel,/"Complete"\)/);
 assert.doesNotMatch(panel,/>Complete</);
 assert.match(panel,/The job stays in its current stage and no payment is recorded/);
});
