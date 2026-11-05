import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("worker sidebar exposes only My Jobs after membership loads",()=>{
 const s=read("business-software-core/components/admin/AdminBrandBar.tsx");
 assert.match(s,/setIsWorker\(String\(d\.admin\?\.role/);
 assert.match(s,/if\(isWorker\)return \[\{name:"My Jobs"/);
 assert.match(s,/permissions===null&&!demo\?\[\]/);
});
test("worker cannot access generic tenant APIs or non-worker pages",()=>{
 const s=read("middleware.ts");
 assert.match(s,/role==="worker".*Worker access is limited to My Jobs/);
 assert.match(s,/session\.admin\.role\)\.toLowerCase\(\)==="worker"&&path!=="\/worker"/);
});
test("worker generic GET POST PATCH DELETE routes are restricted",()=>{
 const s=read("app/api/bms-live/[...path]/route.ts");
 assert.match(s,/\["session","worker\/me","worker\/location-checks"\]/);
 assert.match(s,/\["worker\/attendance","worker\/time"/);
 for(const method of ["PATCH","DELETE"]){const start=s.indexOf("export async function "+method+"(");assert.ok(start>0);assert.match(s.slice(start,start+800),/role\|\|""\)\.toLowerCase\(\)==="worker"/);}
 assert.match(s,/role\|\|""\)\.toLowerCase\(\)==="worker"\|\|!canBms\(member,"manage_workforce"\)/);
});
test("worker cannot read stock or sales orders even with legacy broad permissions",()=>{
 for(const p of ["app/api/bms-stock/route.ts","app/api/bms-sales-orders/route.ts"]){assert.match(read(p),/\.role\|\|""\)\.toLowerCase\(\)==="worker"\)return null/);}
});
