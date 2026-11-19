import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("mark-purchase-order-ordered RPC only moves draft orders to ordered, tenant-guarded and idempotent",()=>{
 const m=source("supabase/migrations/20261118230500_bms_mark_purchase_order_ordered.sql");
 assert.match(m,/create or replace function public\.bms_mark_purchase_order_ordered\(p_tenant uuid, p_order uuid\)/i);
 assert.match(m,/where id = p_order and tenant_id = p_tenant/i,"must be tenant-guarded");
 assert.match(m,/if v\.status = 'ordered' then/i,"already-ordered returns idempotent success");
 assert.match(m,/v\.status <> 'draft' then/i,"rejects orders past draft");
 assert.match(m,/ordered_at = coalesce\(ordered_at, now\(\)\)/i,"ordered_at set once");
 assert.match(m,/where id = p_order and tenant_id = p_tenant and status = 'draft'/i,"update keeps draft guard");
 assert.match(m,/grant execute on function public\.bms_mark_purchase_order_ordered\(uuid,uuid\) to service_role/i);
 assert.doesNotMatch(m,/grant execute on function public\.bms_mark_purchase_order_ordered[^;]*to (anon|authenticated)/i);
 assert.doesNotMatch(m,/security definer/i,"runs with caller privileges like sibling workflow RPCs");
});

test("return-cost side tables carry the same service_role-only grants as their siblings",()=>{
 const m=source("supabase/migrations/20261118230000_bms_return_cost_table_service_grants.sql");
 for(const t of ["business_software_inventory_cost_allocations","business_software_customer_return_cost_sources"]){
  assert.match(m,new RegExp("grant select,insert,update,delete on public\\."+t+" to service_role","i"),t+" grant");
  assert.match(m,new RegExp("revoke all on public\\."+t+" from anon,authenticated","i"),t+" revoke");
  assert.doesNotMatch(m,new RegExp("grant [^;]* on public\\."+t+" to (anon|authenticated)","i"),t+" never granted to client roles");
 }
});

test("route exposes operations/mark-ordered behind the purchasing permission and calls the guarded RPC",()=>{
 const r=source("app/api/bms-live/[...path]/route.ts");
 assert.match(r,/if\(p==="operations\/mark-ordered"\)\{if\(!canBms\(member,"manage_purchasing"\)&&!canBms\(member,"manage_business_settings"\)\)/);
 assert.match(r,/rpc\/bms_mark_purchase_order_ordered/);
 const i=r.indexOf('p==="operations/mark-ordered"');
 assert.ok(r.indexOf("p_tenant:tenantId",i)>0,"server-side tenant binding, client cannot pass tenant");
});

test("purchasing workspace offers Mark as ordered only for draft orders and keeps drafts unsent",()=>{
 const c=source("business-software-core/components/admin/PurchasingWorkspace.tsx");
 assert.match(c,/request\("operations\/mark-ordered",\{order_id:o\.id\}\)/);
 assert.match(c,/o\.status==="draft"&&<button[^>]*onClick=\{\(\)=>void markOrdered\(o\)\}>Mark as ordered<\/button>/);
 assert.match(c,/No supplier order was sent by the system/,"button feedback keeps the no-auto-send promise");
});


test("fictional workflow has an explicit tenant-owned purchase transition and blocks draft receipts",()=>{
 const r=source("app/api/bms-demo/flooring-actions/route.ts");
 const c=source("business-software-core/components/admin/DemoOperationsPanel.tsx");
 const branch=r.slice(r.indexOf('action==="mark_ordered"'),r.indexOf('action==="plan_delivery"'));
 assert.match(branch,/await owned\("business_software_material_orders",tenant,order\)/);
 assert.match(branch,/rpc\("bms_mark_purchase_order_ordered",\{p_tenant:tenant,p_order:order\}\)/);
 assert.match(c,/purchaseOrder\?\.status!=="draft"/);
 assert.match(c,/run\("mark_ordered",\{order_id:purchaseOrder.id\}\)/);
 assert.match(c,/disabled=\{busy\|\|!receiptAllowed\|\|!purchaseLine/);
 assert.match(c,/Nothing is sent to the supplier/);
 const flow=source("tests/flooring-full-order-to-invoice.sql");
 assert.ok(flow.indexOf('bms_mark_purchase_order_ordered(t,po)')<flow.indexOf('bms_receive_purchase_line(t,pl'));
});
