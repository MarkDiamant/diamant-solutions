import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("fictional demo manager authorisation is bound to demo tenant and same-origin HTTPS",()=>{
 const s=source("app/api/bms-demo/flooring-actions/route.ts");
 assert.match(s,/async function memberAllowed\(demoTenantId:string\)/);
 assert.match(s,/tenant_id=eq\."\+demoTenantId/);
 assert.match(s,/role=in\.\(owner,admin,manager\)/);
 assert.match(s,/status=eq\.active/);
 assert.match(s,/if\(!origin\)return response\(/);
 assert.match(s,/source\.protocol!=="https:"/);
 assert.match(s,/memberAllowed\(tenant\)/);
});
test("shared API URL parsing cannot shadow the global URL constructor",()=>{
 for(const p of ["app/api/bms-live/[...path]/route.ts","app/api/bms-materials/route.ts"]){
  const s=source(p);
  assert.match(s,/new globalThis\.URL\(/);
  assert.doesNotMatch(s,/\bnew URL\(/);
 }
});
test("Gmail send and draft routes expose only supported Next route exports",()=>{
 const send=source("app/api/business-software/tenants/[slug]/gmail/send/route.js");
 const draft=source("app/api/business-software/tenants/[slug]/gmail/draft/route.js");
 assert.match(send,/export async function POST/);
 assert.match(draft,/export async function POST/);
 assert.doesNotMatch(send,/export async function createGmailMessage/);
 assert.match(source("lib/business-software/gmail-send.js"),/export async function createGmailMessage/);
});
test("Ruby confirmation state is explicitly declared",()=>{
 const s=source("app/bms-runtime/ai/page.tsx");
 assert.match(s,/\[pending,setPending\]=useState/);
 assert.match(s,/async function confirmAction\(\).*?finally\{setBusy\(false\)\}/s);
 assert.match(s,/async function undoLast\(\).*?finally\{setBusy\(false\)\}/s);
});
