const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=fs.readFileSync('app/api/bms-live/[...path]/route.ts','utf8');
const ui=fs.readFileSync('app/bms-runtime/jobs/[reference]/subcontractors/page.tsx','utf8');
const sql=fs.readFileSync('supabase/migrations/20261026000100_bms_block_legacy_assignment_payment.sql','utf8');

test('legacy assignment endpoint refuses payment creation',()=>{
 assert.match(api,/if\(data&&\("add_payment" in data\|\|"paid_amount" in data\)\)return NextResponse\.json/);
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

test('payment form uses POST, not the assignment PATCH route',()=>{
 assert.match(ui,/const payment=await fetch\(url,\{method:"POST"/);
});
test('generic database RPC rejects subcontractor payment variants',()=>{
 const generic=fs.readFileSync('supabase/migrations/20261026000200_bms_guard_generic_subcontractor_payment_rpc.sql','utf8');
 assert.match(generic,/Subcontractor payments require assignment-linked idempotency/);
 assert.match(generic,/p_data->>'payment_type'/);
});

test('POST records payments while PATCH updates assignment metadata',()=>{
 const post=api.slice(api.indexOf('export async function POST('),api.indexOf('export async function PATCH('));
 const patch=api.slice(api.indexOf('export async function PATCH('),api.indexOf('export async function DELETE('));
 assert.match(post,/if\(parts\[0\]==="jobs"&&parts\[2\]==="subcontractors"&&parts\[3\]\)[\s\S]*?rpc\/bms_record_subcontractor_payment/);
 assert.match(patch,/if\(parts\[0\]==="jobs"&&parts\[2\]==="subcontractors"&&parts\[3\]\)[\s\S]*?rpc\/bms_update_assignment/);
});

test('payment endpoint enforces workforce permission and job ownership',()=>{
 const post=api.slice(api.indexOf('export async function POST('),api.indexOf('export async function PATCH('));
 assert.match(post,/canBms\(member,"manage_workforce"\)/);
 assert.match(post,/Assignment does not belong to this job/);
 assert.match(post,/business_software_job_people\?tenant_id=eq\./);
});

test('reused payment key must preserve original amount',()=>{
 const rpc=fs.readFileSync('supabase/migrations/20261026000300_bms_validate_payment_retry_amount.sql','utf8');
 assert.match(rpc,/Idempotency key reused with different payment details/);
 assert.match(rpc,/amount=p_amount/);
});

test('paid balance cannot be changed through legacy assignment updates',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261026000400_bms_guard_assignment_paid_balance.sql','utf8');
 assert.match(sql,/p_data \? 'paid_amount'/);
 assert.match(sql,/Payment balances may only change through idempotent payment recording/);
});

test('Xero loan descriptions are always queued for manual review',()=>{
 assert.match(api,/const classificationText=\[tx\.Reference/);
 assert.match(api,/capital introduced/);
 assert.match(api,/await queueReview\(tx\);continue/);
});
test('Xero manual payment linking requires a matching payment date',()=>{
 assert.match(api,/candidates\.some\(\(p:any\)=>String\(p\.paid_at\|\|""\)\.slice\(0,10\)!==date\.slice\(0,10\)\)/);
});

test('stock and goods receipt retries reject changed payloads',()=>{
 const stock=fs.readFileSync('supabase/migrations/20261026000500_bms_guard_stock_idempotency_payload.sql','utf8');
 const receipt=fs.readFileSync('supabase/migrations/20261026000600_bms_guard_receipt_idempotency_payload.sql','utf8');
 assert.match(stock,/Stock idempotency key reused with different movement/);
 assert.match(stock,/quantity_delta=p_delta/);
 assert.match(receipt,/Receipt key reused with different goods receipt/);
 assert.match(receipt,/quantity_delta=p_qty/);
});

test('QuickBooks OAuth redirects are limited to trusted deployment hosts',()=>{
 const oauth=fs.readFileSync('app/api/business-software/oauth/quickbooks/callback/route.js','utf8');
 assert.match(oauth,/markdiamants-projects\.vercel\.app/);
 assert.doesNotMatch(oauth,/u\.hostname\.endsWith\("\.vercel\.app"\)/);
});
