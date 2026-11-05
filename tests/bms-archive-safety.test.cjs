const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
test("software page keeps a single embedded BMS selector, no outer controls",()=>{
 const embedded=read("app/software/EmbeddedBmsDemo.js");
 assert.doesNotMatch(embedded,/embeddedBmsChooser|Demo business:|setSample|useState/);
 assert.match(embedded,/iframe src="\/bms-runtime\?sample=northstar"/);
 const selector=read("components/DemoSelector.tsx");
 assert.match(selector,/View demo as/);
});
test("archive does not display internal table names or references",()=>{
 const archive=read("app/bms-runtime/archive/page.tsx");
 assert.match(archive,/This product has historical records and cannot be permanently deleted/);
 assert.doesNotMatch(archive,/Cannot delete:|references\?\.join|body\.references\.join/);
 assert.match(archive,/setProducts\(v=>v\.filter/);
 assert.match(archive,/setNotice\(current\.action/);
 assert.match(archive,/disabled=\{working\|\|!referenceChecks\[p\.id\]\?\.ok\}/);
});
test("server returns sanitised reference statuses and deletion failures",()=>{
 const route=read("app/api/bms-live/[...path]/route.ts");
 assert.match(route,/Object\.fromEntries\(Object\.entries\(raw/);
 assert.match(route,/blocked:!!v\?\.blocked/);
 assert.match(route,/blocked:!!b\?\.blocked/);
 assert.match(route,/bms_archived_product_delete_guard/);
 assert.match(route,/manage_purchasing/);
});
test("database deletion guard is fail closed, locked, tenant scoped, and never cascades",()=>{
 const sql=read("supabase/migrations/20261105_bms_archive_product_guard.sql");
 assert.match(sql,/tenant_id=p_tenant and id=p_product for update/);
 assert.match(sql,/if array_length\(blockers,1\)>0 then return/);
 assert.match(sql,/where id=p_product and tenant_id=p_tenant and active=false/);
 assert.doesNotMatch(sql,/on delete cascade|truncate |delete from public\.business_software_supplier_price_history|delete from public\.bms_material_lines/i);
 assert.match(sql,/revoke all on function public\.bms_archived_product_delete_guard/);
});
