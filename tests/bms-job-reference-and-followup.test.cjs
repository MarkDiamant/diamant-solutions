const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const atomic=fs.readFileSync('supabase/migrations/20261110174500_atomic_tenant_job_reference_allocation.sql','utf8');
const followup=fs.readFileSync('supabase/migrations/20261110181500_materials_ordered_next_action.sql','utf8');
test('tenant-scoped job allocation uses transaction lock and atomic counter',()=>{
 assert.match(atomic,/pg_advisory_xact_lock\(hashtextextended\(p_tenant::text/);
 assert.match(atomic,/on conflict \(tenant_id\) do update/);
 assert.match(atomic,/returning last_number into seq/);
 assert.match(atomic,/not authorised/);
});
test('historical references remain explicit and positive',()=>{
 assert.match(atomic,/historicalSequenceNumber/);
 assert.match(atomic,/if seq < 1 then raise exception/);
});
test('materials ordered regenerates next action and short due date',()=>{
 assert.match(followup,/when 'materials_ordered' then 'Confirm materials delivery and schedule works'/);
 assert.match(followup,/in_progress','materials_ordered','site_visit_required/);
 assert.match(followup,/new\.status is distinct from old\.status/);
});
