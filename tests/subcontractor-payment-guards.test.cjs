const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=fs.readFileSync('app/api/bms-live/[...path]/route.ts','utf8');
const ui=fs.readFileSync('app/bms-runtime/jobs/[reference]/subcontractors/page.tsx','utf8');
const sql=fs.readFileSync('supabase/migrations/20261026000100_bms_block_legacy_assignment_payment.sql','utf8');

test('legacy assignment endpoint refuses payment creation',()=>{
 assert.match(api,/if\(data&&\("add_payment" in data\)\)return NextResponse\.json/);
});
test('dedicated payment requires a stable request key',()=>{
 assert.match(api,/const key=String\(data\.request_key\|\|""\)\.trim\(\)/);
 assert.match(api,/rpc\/bms_record_subcontractor_payment/);
 assert.doesNotMatch(api,/legacy:"\+parts\[3\]/);
});
test('finance UI separates assignment save and idempotent payment',()=>{
 assert.match(ui,/if\(add>0\)/);
 assert.match(ui,/paymentKeys\.current\[a\.id\]/);
 assert.match(ui,/request_key:key/);
 assert.doesNotMatch(ui,/paid_amount:paidExisting\+add/);
});
test('database migration rejects legacy payment inserts',()=>{
 assert.match(sql,/p_data \? 'add_payment'/);
 assert.match(sql,/RAISE EXCEPTION 'Use dedicated idempotent subcontractor payment endpoint'/);
 assert.doesNotMatch(sql,/INSERT INTO business_software_payments/i);
});

test('Ruby and generic job actions reject non-idempotent subcontractor payments',()=>{
 assert.match(api,/plan\.kind==="record_payment"&&\(String\(payload\.direction/);
 assert.match(api,/data\?\.type==="payment"&&\(String\(data\.direction/);
});
