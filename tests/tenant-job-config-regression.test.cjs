const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const config=fs.readFileSync('business-software-core/lib/config.ts','utf8');
const job=fs.readFileSync('business-software-core/components/admin/JobDetail.tsx','utf8');
const settings=fs.readFileSync('app/bms-runtime/settings/page.tsx','utf8');
test('tenant-specific material and colour options have empty defaults and preserved lists',()=>{
 for(const field of ['materialOptions','colourOptions']){
  assert.match(config,new RegExp(field+': string\\[\\]'));
  assert.match(config,new RegExp(field+': Array\\.isArray\\(value\\?\\.'+field+'\\)'));
  assert.match(settings,new RegExp('title="'+(field==='materialOptions'?'Materials':'Colours / RAL')+'"'));
 }
});
test('retired work types and workforce roles do not reset to defaults',()=>{
 for(const field of ['workTypes','workforceRoles'])assert.match(config,new RegExp(field+': Array\\.isArray\\(value\\?\\.'+field+'\\)'));
 assert.match(settings,/Existing jobs and historical records will retain their saved values/);
 assert.match(settings,/Existing assignments will keep their recorded role/);
});
test('job overview has no duplicate status card and offers material and colour free-text choices',()=>{
 assert.match(job,/aria-label="Job priorities"/);
 assert.doesNotMatch(job,/<Summary label="Status">/);
 assert.match(job,/list="bms-job-material-options"/);
 assert.match(job,/list="bms-job-colour-options"/);
});
test('quick edit exposes due date and internal job notes',()=>{
 assert.match(job,/setQuickDue/);
 assert.match(job,/next_action_at:closed\(j\.status\)\?null:iso\(quickDue\)/);
 assert.match(job,/Job notes \(internal only\)/);
});
