import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("sales order display status derives complete from fulfilled lines and keeps cancelled",()=>{
 const s=source("app/bms-sales-orders/page.tsx");
 assert.match(s,/const orderDisplayStatus=/);
 assert.match(s,/if\(raw==="cancelled"\)return "cancelled"/);
 assert.match(s,/oq>0&&fq>=oq\?"complete":raw/);
 assert.match(s,/Status: \{orderDisplayStatus\}/);
 assert.doesNotMatch(s,/Status: \{order\.status\}/);
});

test("purchase order display status derives received only for fully received ordered POs",()=>{
 const s=source("business-software-core/components/admin/PurchasingWorkspace.tsx");
 assert.match(s,/const purchaseOrderDisplayStatus=\(o:Order\)=>\{/);
 assert.match(s,/if\(o\.status!=="ordered"\)return o\.status/);
 assert.match(s,/oq>0&&rq>=oq\?"received":o\.status/);
 assert.match(s,/\{purchaseOrderDisplayStatus\(o\)\}/);
});

test("derived labels add no new raw statuses and never rewrite stored state",()=>{
 const sales=source("app/bms-sales-orders/page.tsx");
 const purchasing=source("business-software-core/components/admin/PurchasingWorkspace.tsx");
 // derivations are display-only: no writes back to the order record
 assert.doesNotMatch(sales,/orderDisplayStatus[^\n]*update/i);
 assert.doesNotMatch(purchasing,/purchaseOrderDisplayStatus[^\n]*update/i);
});
