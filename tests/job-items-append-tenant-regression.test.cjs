const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=fs.readFileSync('app/api/bms-live/[...path]/route.ts','utf8');
const editor=fs.readFileSync('business-software-core/components/admin/JobItemsEditor.tsx','utf8');
test('append job item requires explicit confirmation, job permission and tenant-scoped ownership',()=>{
 const start=api.indexOf('parts[3]==="append"&&parts.length===4');
 assert.ok(start>0);
 const block=api.slice(start,start+3400);
 for(const pattern of [/canBms\(member,"edit_jobs"\)/,/b\.confirm!==true/,/tenant_id=eq/,/reference=eq/,/job_id=eq/,/position/,/method:"POST"/])assert.match(block,pattern);
 assert.doesNotMatch(block,/method:"DELETE"/);
});
test('existing item revisions remain independent from append flow',()=>{
 assert.match(editor,/endpoint\+"\/append"/);
 assert.match(editor,/Add another item/);
 assert.match(editor,/Existing items, revisions and financial documents will remain unchanged/);
 assert.match(editor,/endpoint\+"\/revise"/);
});
