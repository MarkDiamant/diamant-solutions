const {test}=require("node:test");
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const fs=require("node:fs");
const ts=require("typescript");
const Module=require("node:module");
const path=require("node:path");
const file=path.join(__dirname,"../app/api/stripe/bms-seats-webhook/route.ts");
const js=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod._compile(js,file);
const {POST}=mod.exports;
const tenant="11111111-1111-4111-8111-111111111111",secret="whsec_fictional_signature_test_only",subId="sub_fictional",customer="cus_fictional";
const previous={};
for(const [key,value] of Object.entries({BMS_TEST_ISOLATED:"false",STRIPE_BMS_SEATS_WEBHOOK_SECRET:secret,STRIPE_SECRET_KEY:"sk_test_fictional_not_real",BMS_STRIPE_SEAT_PRICE_ID:"price_seat",BMS_STRIPE_BASE_PRICE_ID:"price_base",BMS_STRIPE_ANNUAL_SEAT_PRICE_ID:"price_year_seat",BMS_STRIPE_ANNUAL_BASE_PRICE_ID:"price_year_base",DS_SUPABASE_URL:"https://fictional.invalid",DS_SUPABASE_SERVICE_ROLE_KEY:"fictional_service_key"})){previous[key]=process.env[key];process.env[key]=value;}
function signed(event,{timestamp=Math.floor(Date.now()/1000),tamper=false}={}){const body=JSON.stringify(event);const sig=crypto.createHmac("sha256",secret).update(timestamp+"."+body).digest("hex");return new Request("https://fictional.invalid/api/stripe/bms-seats-webhook",{method:"POST",headers:{"stripe-signature":"t="+timestamp+",v1="+(tamper?"00".repeat(32):sig)},body});}
const evt=(type,obj={})=>({id:"evt_fictional_"+type.replaceAll(".","_"),type,created:Math.floor(Date.now()/1000),data:{object:{id:"in_fictional",subscription:subId,...obj}}});
function fixtureFetch({seats=2,paid=true,invoiceSeats=3,invoiceHasMore=false,metadata=true,rpcOk=true}={}){const calls=[];global.fetch=async(url,opts={})=>{const u=String(url);calls.push({url:u,body:opts.body?JSON.parse(opts.body):null});let response,status=200;if(u.includes("/subscriptions/"))response={id:subId,customer,metadata:metadata?{product:"bms_seats",tenant_id:tenant}:{},status:"active",items:{data:[{quantity:1,price:{id:"price_base",recurring:{interval:"month"}}},{quantity:seats,price:{id:"price_seat",recurring:{interval:"month"}}}]}};else if(u.includes("/lines?"))response={has_more:invoiceHasMore,data:[{price:{id:"price_base"},quantity:1},{price:{id:"price_seat"},quantity:invoiceSeats-1}]};else if(u.includes("/invoices/"))response={id:"in_fictional",subscription:subId,status:paid?"paid":"open",paid};else if(u.includes("/rpc/")){response=rpcOk?true:{message:"fictional DB rejection"};status=rpcOk?200:409;}else throw Error("Unexpected external call "+u);return new Response(JSON.stringify(response),{status,headers:{"content-type":"application/json"}})};return calls;}
test("signed paid invoice reaches isolated billing RPC with verified seats",async()=>{const calls=fixtureFetch();const r=await POST(signed(evt("invoice.paid")));assert.equal(r.status,200);const rpc=calls.find(x=>x.url.includes("/rpc/"));assert.ok(rpc);assert.equal(rpc.body.p_seats,3);assert.equal(rpc.body.p_tenant,tenant);});
test("bad signature and stale signature are rejected before external access",async()=>{const calls=fixtureFetch();assert.equal((await POST(signed(evt("invoice.paid"),{tamper:true}))).status,400);assert.equal((await POST(signed(evt("invoice.paid"),{timestamp:Math.floor(Date.now()/1000)-400}))).status,400);assert.equal(calls.length,0);});
test("unpaid invoice never grants seats",async()=>{const calls=fixtureFetch({paid:false});assert.equal((await POST(signed(evt("invoice.paid")))).status,409);assert.equal(calls.some(x=>x.url.includes("/rpc/")),false);});
test("invoice for fewer seats than current subscription does not grant upgrade",async()=>{const calls=fixtureFetch({seats:5,invoiceSeats:3});const r=await POST(signed(evt("invoice.paid")));assert.equal(r.status,200);assert.equal((await r.json()).ignored,true);assert.equal(calls.some(x=>x.url.includes("/rpc/")),false);});
test("incomplete invoice pagination fails closed",async()=>{const calls=fixtureFetch({invoiceHasMore:true});assert.equal((await POST(signed(evt("invoice.paid")))).status,503);assert.equal(calls.some(x=>x.url.includes("/rpc/")),false);});
test("non BMS subscriptions cannot mutate tenant billing",async()=>{const calls=fixtureFetch({metadata:false});const r=await POST(signed(evt("invoice.paid")));assert.equal((await r.json()).ignored,true);assert.equal(calls.some(x=>x.url.includes("/rpc/")),false);});
test("signed payment failure forwards event type without paid-seat verification",async()=>{const calls=fixtureFetch();const r=await POST(signed(evt("invoice.payment_failed")));assert.equal(r.status,200);const rpc=calls.find(x=>x.url.includes("/rpc/"));assert.equal(rpc.body.p_type,"invoice.payment_failed");});
test("signed cancellation forwards cancellation for isolated subscription",async()=>{const calls=fixtureFetch();const r=await POST(signed(evt("customer.subscription.deleted",{id:subId})));assert.equal(r.status,200);const rpc=calls.find(x=>x.url.includes("/rpc/"));assert.equal(rpc.body.p_type,"customer.subscription.deleted");});
test("signed subscription update reaches RPC without falsely claiming invoice paid",async()=>{const calls=fixtureFetch();const r=await POST(signed(evt("customer.subscription.updated",{id:subId})));assert.equal(r.status,200);assert.equal(calls.some(x=>x.url.includes("/invoices/")),false);});
test("RPC failure returns retryable error instead of webhook success",async()=>{fixtureFetch({rpcOk:false});assert.equal((await POST(signed(evt("invoice.paid")))).status,503);});
process.on("exit",()=>{for(const [key,value] of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;});

test("annual paid invoice uses annual catalogue and records annual entitlement",async()=>{
 const calls=[];global.fetch=async(url,opts={})=>{
  const u=String(url);calls.push({url:u,body:opts.body?JSON.parse(opts.body):null});
  let response={};
  if(u.includes("/subscriptions/"))response={id:subId,customer,metadata:{product:"bms_seats",tenant_id:tenant},status:"active",items:{data:[{quantity:1,price:{id:"price_year_base",recurring:{interval:"year"}}},{quantity:2,price:{id:"price_year_seat",recurring:{interval:"year"}}}]}};
  else if(u.includes("/lines?"))response={has_more:false,data:[{price:{id:"price_year_base"},quantity:1},{price:{id:"price_year_seat"},quantity:2}]};
  else if(u.includes("/invoices/"))response={id:"in_fictional",subscription:subId,status:"paid",paid:true};
  else if(u.includes("/rpc/"))response=true;
  else throw Error("Unexpected URL "+u);
  return new Response(JSON.stringify(response),{status:200,headers:{"content-type":"application/json"}});
 };
 const r=await POST(signed(evt("invoice.paid",{id:"in_fictional"})));assert.equal(r.status,200);
 const rpc=calls.find(x=>x.url.includes("/rpc/"));assert.ok(rpc);assert.equal(rpc.body.p_interval,"annual");assert.equal(rpc.body.p_seats,3);
});

test("isolated seat webhook rejects wrong Supabase project before external access",async()=>{const old=process.env.BMS_TEST_ISOLATED;process.env.BMS_TEST_ISOLATED="true";const calls=fixtureFetch();try{const r=await POST(signed(evt("invoice.paid")));assert.equal(r.status,503);assert.equal(calls.length,0);}finally{process.env.BMS_TEST_ISOLATED=old;}});
