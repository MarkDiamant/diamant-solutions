import test from "node:test";
import assert from "node:assert/strict";
const base=(process.env.BMS_TEST_BASE_URL||"https://bms.diamantsolutions.co.uk").replace(/\/$/,"");
const get=async path=>{const r=await fetch(base+path,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(20000)});return {r,data:await r.json().catch(()=>({}))}};
test("public fictional website feed is private-data-safe",async()=>{
 const {r,data}=await get("/api/bms-demo/catalogue");
 assert.equal(r.status,200);
 assert.equal(data.fictional,true);
 assert.equal(data.products?.length,4);
 const oak=data.products.find(x=>x.sku==="FL-LAM-OAK8");
 assert.ok(oak,"Oak product must be in catalogue");
 assert.equal(oak.coverage_m2,2.2);
 assert.equal(oak.list_price_net,39);
 const raw=JSON.stringify(data);
 for(const field of ["customer_prices","cost_net","customer_id","supplier_id","auth_user_id","email","phone"]){
  assert.ok(!raw.includes('"'+field+'"'),"Private field leaked: "+field);
 }
});
test("fictional operational snapshot has correct customer pricing",async()=>{
 const {r,data}=await get("/api/bms-demo/flooring-data");
 assert.equal(r.status,200);
 assert.equal(data.fictional,true);
 const oak=data.products.find(x=>x.sku==="FL-LAM-OAK8");
 assert.ok(oak);
 assert.equal(Math.ceil(48*1.1/Number(oak.specifications.coverage_m2_per_pack)),24);
 assert.ok(data.customer_prices.some(x=>x.product_id===oak.id&&Number(x.sell_net)===37));
});
test("anonymous demo write and reset are forbidden",async()=>{
 const r=await fetch(base+"/api/bms-demo/flooring-actions",{method:"POST",headers:{"Content-Type":"application/json",Origin:base},body:JSON.stringify({action:"reset_demo",confirm_phrase:"RESET OAK AND STONE DEMO",request_key:"public-smoke-noauth-0001"}),signal:AbortSignal.timeout(20000)});
 assert.equal(r.status,403);
});
test("cross-origin reset is forbidden",async()=>{
 const r=await fetch(base+"/api/bms-demo/flooring-actions",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://invalid.example"},body:JSON.stringify({action:"reset_demo",confirm_phrase:"RESET OAK AND STONE DEMO",request_key:"public-smoke-origin-0001"}),signal:AbortSignal.timeout(20000)});
 assert.equal(r.status,403);
});
test("invalid bearer cookie cannot authorise demo mutations",async()=>{
 const r=await fetch(base+"/api/bms-demo/flooring-actions",{method:"POST",headers:{"Content-Type":"application/json",Origin:base,Cookie:"bms_access_token=invalid-fictional-test-token"},body:JSON.stringify({action:"__non_mutating_auth_probe__",request_key:"public-smoke-invalid-0001"}),signal:AbortSignal.timeout(20000)});
 assert.equal(r.status,403);
});
