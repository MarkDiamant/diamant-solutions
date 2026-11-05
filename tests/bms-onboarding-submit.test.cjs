const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),Module=require("node:module");
const file=path.join(__dirname,"../app/api/onboarding/submit/route.js"),source=fs.readFileSync(file,"utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const originalLoad=Module._load;Module._load=function(name,...args){if(name==="next/server")return {NextResponse:{json:(body,{status=200}={})=>({status,body})}};return originalLoad.call(this,name,...args)};
process.env.DS_SUPABASE_URL="https://fictional.invalid";process.env.DS_SUPABASE_SERVICE_ROLE_KEY="fictional_test_key";
const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod._compile(js,file);Module._load=originalLoad;
const tenant="11111111-1111-4111-8111-111111111111",email="fictional@example.invalid";
const answers={businessName:"Fictional Ltd",contactName:"Fictional",email,phone:"000",businessType:"Services",workflow:"Quote to invoice",features:"Jobs",users:"2",optionalModules:["Customers","Quotes","Inventory","Inventory","Not a module"]};
function mock({member=true,paid=true,status="in_progress",emailOverride=email}={}){const calls=[];global.fetch=async(url,opts={})=>{const u=String(url);calls.push({u,opts});let value=[];
 if(u.includes("/auth/v1/user"))value={id:"33333333-3333-4333-8333-333333333333",email:emailOverride};
 else if(u.includes("/tenant_members?"))value=member?[{tenant_id:tenant}]:[];
 else if(u.includes("/checkout_orders?"))value=paid?[{id:"paid_checkout"}]:[];
 else if(u.includes("/rest/v1/onboarding?")&&opts.method==="PATCH")value=[{tenant_id:tenant}];
 else if(u.includes("/rest/v1/onboarding?"))value=[{status,service_type:"business_software"}];
 return {ok:true,json:async()=>value,text:async()=>""};
};return calls}
function request({token="fictional_token",a=answers}={}){return new Request("https://fictional.invalid/api/onboarding/submit",{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:JSON.stringify({tenantId:tenant,service:"business_software",answers:a})})}
test("signup submission requires authentication",async()=>{const calls=mock();const r=await mod.exports.POST(request({token:""}));assert.equal(r.status,401);assert.equal(calls.length,0)});
test("signup submission enforces tenant membership",async()=>{mock({member:false});assert.equal((await mod.exports.POST(request())).status,403)});
test("signup submission enforces matching purchaser email",async()=>{mock({emailOverride:"other@example.invalid"});assert.equal((await mod.exports.POST(request())).status,403)});
test("signup submission requires verified paid checkout",async()=>{const calls=mock({paid:false});assert.equal((await mod.exports.POST(request())).status,403);assert.equal(calls.some(c=>c.opts.method==="PATCH"),false)});
test("submitted signup is idempotent",async()=>{const calls=mock({status:"submitted"});const r=await mod.exports.POST(request());assert.equal(r.body.alreadySubmitted,true);assert.equal(calls.some(c=>c.opts.method==="PATCH"),false)});
test("successful signup stores reviewed modules without enabling unsupported names",async()=>{const calls=mock();const r=await mod.exports.POST(request());assert.equal(r.status,200);const patch=calls.find(c=>c.opts.method==="PATCH");assert.ok(patch);const body=JSON.parse(patch.opts.body);assert.equal(body.status,"submitted");assert.equal(body.proposed_config.reviewRequired,true);assert.deepEqual(body.proposed_config.modules.enabled,["Customers","Quotes","Inventory"]);assert.equal(body.proposed_config.tasks.some(x=>x.key==="configure_stock"),true)});
