const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const route=fs.readFileSync('app/api/business-software/tasks/route.ts','utf8');
const panel=fs.readFileSync('business-software-core/components/admin/TasksPanel.tsx','utf8');
const mig=fs.readFileSync('supabase/migrations/20261119150000_bms_complete_job_followup.sql','utf8');
test('job follow-up Done is explicit: no automatic advance or clear, one atomic RPC',()=>{
 const seg=route.slice(route.indexOf('if(b.status!=="completed")return NextResponse.json({error:"This job next action'));
 const job=seg.slice(0,seg.indexOf('const current=await fullTask'));
 assert.match(job,/rpc\/bms_complete_job_followup/);
 assert.match(job,/Choose the next follow-up date or a stage/);
 assert.doesNotMatch(job,/nextJobStep\(/);
 assert.doesNotMatch(job,/next_action:null/);
 assert.match(job,/p_tenant:c\.tenant\.id/);
});
test('migration is atomic, tenant-scoped, audited and not callable by anon/authenticated',()=>{
 assert.match(mig,/where id=p_job and tenant_id=p_tenant/);
 assert.match(mig,/for update/);
 assert.match(mig,/insert into public\.business_software_audit_events/);
 assert.match(mig,/revoke all on function[^;]*from public, anon, authenticated/);
 assert.match(mig,/grant execute on function[^;]*to service_role/);
 assert.match(mig,/Next follow-up must be in the future/);
});
test('panel asks for date or stage, verifies the persisted result and reloads after failure',()=>{
 assert.match(panel,/aria-label="Follow-up done"/);
 assert.match(panel,/Nothing is chosen for you/);
 assert.match(panel,/!p\.next_at&&!p\.new_status\)\{setDoneFor/);
 assert.match(panel,/gotAt<=Date\.now\(\)/);
 assert.match(panel,/b\.job\.status!==p\.new_status/);
 assert.match(panel,/try\{await load\(\)\}catch\{\}setErr\("Task change not saved: "/);
 assert.doesNotMatch(panel,/The job follow-up was not completed/);
 assert.match(panel,/disabled=\{\(!doneFor\.at&&!doneFor\.stage\)\|\|updating===doneFor\.id\}/);
});
