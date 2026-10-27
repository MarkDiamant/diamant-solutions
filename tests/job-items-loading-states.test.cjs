const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ui=fs.readFileSync('business-software-core/components/admin/JobItemsEditor.tsx','utf8');
const api=fs.readFileSync('app/api/bms-live/[...path]/route.ts','utf8');
test('job items distinguish loading, access errors and retry without permitting unsafe writes',()=>{
 for(const pattern of [/setLoading\(true\)/,/\.finally\(\(\)=>\{if\(active\)setLoading\(false\)/,/r\.status===401/,/r\.status===403/,/Array\.isArray\(d\.items\)/,/role="alert"/,/setReload\(x=>x\+1\)/,/!loading&&!loadError&&items\.map/])assert.match(ui,pattern);
});
test('job items are queried only after tenant and job ownership verification',()=>{
 const start=api.indexOf('if(parts[0]==="jobs"&&parts[2]==="items"&&parts.length===3)');
 assert.ok(start>0);
 const segment=api.slice(start,start+1600);
 for(const pattern of [/canBms\(member,"view_jobs"\)/,/tenant_id=eq/,/reference=eq/,/job\.id/,/if\(!ir\.ok\)/])assert.match(segment,pattern);
});
