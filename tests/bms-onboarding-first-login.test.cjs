const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),Module=require("node:module");
const file=path.join(__dirname,"../app/api/onboarding/launch/route.ts");
const js=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const originalLoad=Module._load;
Module._load=function(name,...args){if(name==="next/server")return {NextResponse:{json:(body,{status=200}={})=>({status,body})}};if(name==="node:dns/promises")return {default:{lookup:async()=>({address:"127.0.0.1"})},lookup:async()=>({address:"127.0.0.1"})};return originalLoad.call(this,name,...args)};
const previous={DS_SUPABASE_URL:process.env.DS_SUPABASE_URL,DS_SUPABASE_SERVICE_ROLE_KEY:process.env.DS_SUPABASE_SERVICE_ROLE_KEY};
process.env.DS_SUPABASE_URL="https://fictional.invalid";process.env.DS_SUPABASE_SERVICE_ROLE_KEY="fictional_test_key";
const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod._compile(js,file);Module._load=originalLoad;
const user="11111111-1111-4111-8111-111111111111",checkout="22222222-2222-4222-8222-222222222222",bms="33333333-3333-4333-8333-333333333333";
function mock({member=true,approved=true,active=true,owner=true,host="fictional.diamantsolutions.co.uk"}={}){const calls=[];global.fetch=async(url)=>{const u=String(url);calls.push(u);let result=[];
 if(u.includes("/auth/v1/user"))result={id:user};
 else if(u.includes("/tenant_members?"))result=member?[{tenant_id:checkout}]:[];
 else if(u.includes("/business_software_onboarding_reviews?"))result=approved?[{applied_bms_tenant_id:bms}]:[];
 else if(u.includes("/business_software_tenants?"))result=active?[{slug:"fictional",canonical_host:host}]:[];
 else if(u.includes("/business_software_users?"))result=owner?[{id:user}]:[];
 return {ok:true,json:async()=>result};
};return calls;}
function request({token="fictional_test_token",tenantId=checkout}={}){return new Request("https://fictional.invalid/api/onboarding/launch?tenantId="+tenantId,{headers:token?{Authorization:"Bearer "+token}:{}})}
test("first login rejects unauthenticated requests",async()=>{const calls=mock();const r=await mod.exports.GET(request({token:""}));assert.equal(r.status,401);assert.equal(calls.length,0)});
test("first login rejects missing owner membership",async()=>{mock({member:false});const r=await mod.exports.GET(request());assert.equal(r.body.ready,false)});
test("first login rejects a different tenant even with a valid session",async()=>{const calls=mock();const r=await mod.exports.GET(request({tenantId:"44444444-4444-4444-8444-444444444444"}));assert.equal(r.body.ready,false);assert.equal(calls.some(x=>x.includes("onboarding_reviews")),false)});
test("first login waits for internal approval",async()=>{mock({approved:false});const r=await mod.exports.GET(request());assert.equal(r.body.ready,false)});
test("first login waits for active tenant and owner",async()=>{mock({active:false});assert.equal((await mod.exports.GET(request())).body.ready,false);mock({owner:false});assert.equal((await mod.exports.GET(request())).body.ready,false)});
test("first login rejects external canonical host",async()=>{mock({host:"fictional.attacker.invalid"});const r=await mod.exports.GET(request());assert.equal(r.body.ready,false)});
test("approved active owner receives correct tenant login URL",async()=>{mock();const r=await mod.exports.GET(request());assert.equal(r.body.ready,true);assert.equal(r.body.url,"https://fictional.diamantsolutions.co.uk/login")});
process.on("exit",()=>{for(const [k,v] of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v});
