const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");
const vm=require("node:vm");
const source=fs.readFileSync(require("node:path").join(__dirname,"../app/api/internal/bms-onboarding/route.ts"),"utf8");
const start=source.indexOf("async function activationEmail("),end=source.indexOf("\nexport async function GET(",start);
assert.ok(start>=0&&end>start,"Activation implementation not found");
const functionSource=source.slice(start,end).split("\nasync function ")[0];
const js=ts.transpileModule(functionSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const tid="11111111-1111-4111-8111-111111111111",bmsId="22222222-2222-4222-8222-222222222222";
function setup({sent=false,owner=true,dnsOk=true,resendOk=true,markOk=true}={}){
 const calls=[];const state={sent};const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}});
 const rest=async(p,opts={})=>{calls.push({kind:"db",path:p,body:opts.body?JSON.parse(opts.body):null});
 if(p.startsWith("business_software_onboarding_reviews?"))return json([{applied_bms_tenant_id:bmsId,activation_email_sent_at:state.sent?"2026-01-01T00:00:00Z":null}]);
 if(p.startsWith("business_software_tenants?"))return json([{canonical_host:"fictional.diamantsolutions.co.uk",business_name:"Fictional Co"}]);
 if(p.startsWith("checkout_orders?"))return json([{customer_email:"fictional@example.invalid"}]);
 if(p.startsWith("business_software_users?"))return json(owner?[{id:"owner"}]:[]);
 if(p==="rpc/bms_mark_activation_email"){if(!markOk)return json({message:"test mark failure"},500);state.sent=opts.body&&JSON.parse(opts.body).p_sent;return json(true);}
 throw Error("Unexpected DB call "+p);
 };
 const fetch=async(url,opts)=>{calls.push({kind:"email",url,body:JSON.parse(opts.body),headers:opts.headers});return json(resendOk?{id:"em_fictional"}:{message:"fictional failure"},resendOk?200:503);};
 const dns={lookup:async()=>{if(!dnsOk)throw Error("ENOTFOUND")}};
 const context=vm.createContext({rest,fetch,dns,process:{env:{RESEND_API_KEY:"fictional_test_key"}},Error,Promise,encodeURIComponent,JSON,Response});
 vm.runInContext(js,context);
 return {send:()=>vm.runInContext("activationEmail("+JSON.stringify(tid)+")",context),calls,state};
}
test("approved active owner and paid order generate one fictional activation request",async()=>{const x=setup();const result=await x.send();assert.equal(result.sent,true);const mail=x.calls.filter(c=>c.kind==="email");assert.equal(mail.length,1);assert.deepEqual(Array.from(mail[0].body.to),["fictional@example.invalid"]);assert.match(mail[0].body.text,/fictional\.diamantsolutions\.co\.uk\/login/);assert.equal(mail[0].headers["Idempotency-Key"],"ds-bms-approved-"+tid);});
test("second send does not dispatch another email",async()=>{const x=setup();await x.send();const r=await x.send();assert.equal(r.alreadySent,true);assert.equal(x.calls.filter(c=>c.kind==="email").length,1);});
test("unverified owner prevents all email delivery",async()=>{const x=setup({owner:false});await assert.rejects(x.send(),/Verified owner/);assert.equal(x.calls.filter(c=>c.kind==="email").length,0);});
test("unresolved tenant domain blocks email delivery",async()=>{const x=setup({dnsOk:false});await assert.rejects(x.send(),/wildcard CNAME/);assert.equal(x.calls.filter(c=>c.kind==="email").length,0);});
test("failed provider response remains unsent and can retry",async()=>{const x=setup({resendOk:false});await assert.rejects(x.send(),/delivery failed/);assert.equal(x.state.sent,false);});
test("already sent record prevents duplicate provider delivery",async()=>{const x=setup({sent:true});const r=await x.send();assert.equal(r.alreadySent,true);assert.equal(x.calls.filter(c=>c.kind==="email").length,0);});
test("provider success but failed DB mark returns actionable error with idempotency key",async()=>{const x=setup({markOk:false});await assert.rejects(x.send(),/delivery record/);assert.equal(x.calls.filter(c=>c.kind==="email").length,1);});
