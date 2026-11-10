const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const api=fs.readFileSync('app/api/business-software/tasks/route.ts','utf8');
const ui=fs.readFileSync('business-software-core/components/admin/TasksPanel.tsx','utf8');
test('job follow-up completion requires persisted row and explicit acknowledgement',()=>{assert.match(api,/saved\.id!==jobId/);assert.match(api,/completed_followup:true/);assert.match(ui,/b\.completed_followup!==true/);assert.doesNotMatch(ui,/!b\.advanced&&b\.job\.next_action!=null/);});
test('ordinary task completion and reopening verify persisted status',()=>{assert.match(api,/savedTask\.id!==id/);assert.match(api,/savedTask\.status!==data\.status/);assert.match(api,/if\(b\.status==="completed"\)/);assert.match(api,/if\(b\.status==="open"\)/);assert.match(api,/data\.completed_at=null/);});
test('job follow-up update is tenant scoped',()=>{assert.match(api,/business_software_jobs\?tenant_id=eq\."\+c\.tenant\.id\+"&id=eq\."\+esc\(jobId\)/);});

test('stale job follow-up is rejected rather than completing a different action',()=>{assert.match(api,/b\.expected_next_action!=null/);assert.match(api,/String\(b\.expected_next_action\)!==String\(j\.next_action\|\|""\)/);assert.match(ui,/expected_next_action:/);});
