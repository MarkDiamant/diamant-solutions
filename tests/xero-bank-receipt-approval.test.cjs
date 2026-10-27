const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const route=fs.readFileSync("app/api/business-software/xero/bank-receipts/route.ts","utf8");
test("Xero bank receipt discovery never posts directly into genuine payment ledgers",()=>{
 assert.doesNotMatch(route,/rpc\/bms_record_verified_bank_receipt/);
 assert.match(route,/human has checked the Xero transaction/);
 assert.match(route,/business_software_accounting_unmatched_receipts\?on_conflict=tenant_id,provider,external_transaction_id/);
});
test("discovery is tenant scoped and excludes loans and internal transfers",()=>{
 assert.match(route,/tenant_id=eq/);
 assert.match(route,/director\(\?:'s\)\?/);
 assert.match(route,/IsReconciled==true/);
 assert.match(route,/invoiced\.has/);
});
test("Xero pages and 429 retry-after are handled without silent success",()=>{
 assert.match(route,/page<=100/);
 assert.match(route,/retry-after/);
 assert.match(route,/failed\+\+;break/);
 assert.match(route,/if\(txs\.length<100\)break/);
});

test("loan classifier uses real regex boundaries and detects known non-customer receipts",()=>{
 const match=route.match(/if\((\/[^\n]+?\/i)\.test\(accountClassification\)\)/);
 assert.ok(match,"Expected explicit loan exclusion regex");
 const classifier=Function("return "+match[1])();
 for(const value of ["Loan","Director's loan","internal account transfer","capital introduced","owner's contribution"])assert.ok(classifier.test(value),value);
 assert.equal(classifier.test("MJ010 customer deposit"),false);
});
