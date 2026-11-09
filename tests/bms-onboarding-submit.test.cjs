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

test("submitted Flooring setup organises purchasing, inventory, materials and workforce for admin review",async()=>{
 const calls=mock();const a={...answers,businessType:"Flooring installation",optionalModules:["Jobs","Price book","Purchasing","Inventory","Goods received","Job allocations","Workforce","Labour costing","Invoices"],locationsSetup:"Main warehouse; vans",stockOpening:"Import stock count",suppliersSetup:"Flooring wholesaler",catalogueImport:"Upload CSV",purchaseApproval:"Owner approval",goodsReceiving:"Receive into warehouse",jobMaterials:"Allocate flooring per job",stockAllocation:"Reserve before installation",staffStructure:"Two fitting teams",labourRates:"Per square metre",roles:"Owner, fitter",permissionsPolicy:"Fitters only see assigned jobs",productTypes:"Carpet, laminate, LVT",productCosting:"Fitting, uplift",vatSettings:"Standard",invoiceSettings:"14 days",flooringMeasurements:"Room dimensions and area",flooringUnits:"m2 and pack",flooringFitting:"Two fitters"};
 const r=await mod.exports.POST(request({a}));assert.equal(r.status,200);
 const patch=calls.find(c=>c.opts.method==="PATCH");const config=JSON.parse(patch.opts.body).proposed_config;
 assert.equal(config.version,3);assert.equal(config.questionnaire.sections.inventory.stockLocations,"Main warehouse; vans");
 assert.equal(config.questionnaire.sections.materials.reservations,"Reserve before installation");
 assert.equal(config.questionnaire.sections.workforce.labourRates,"Per square metre");
 assert.equal(config.questionnaire.sections.flooring.measurements,"Room dimensions and area");assert.equal(config.questionnaire.sections.flooring.units,"m2 and pack");assert.ok(config.tasks.some(t=>t.key==="configure_flooring"));
 assert.equal(config.questionnaire.sections.users.permissions,"Fitters only see assigned jobs");
 for(const key of ["configure_price_book","configure_purchasing","configure_materials","configure_users","configure_stock","configure_workforce"])assert.ok(config.tasks.some(t=>t.key===key),key);
 assert.equal(config.approved,false);assert.equal(config.reviewRequired,true);
});
test("irrelevant questionnaire sections are omitted from proposed setup",async()=>{
 const calls=mock();const r=await mod.exports.POST(request({a:{...answers,optionalModules:["Customers","Quotes"],locationsSetup:"Should not configure"}}));
 assert.equal(r.status,200);const config=JSON.parse(calls.find(c=>c.opts.method==="PATCH").opts.body).proposed_config;
 assert.equal(config.questionnaire.sections.inventory,undefined);
 assert.equal(config.questionnaire.sections.purchasing,undefined);
 assert.equal(config.tasks.some(t=>t.key==="configure_stock"),false);
});
