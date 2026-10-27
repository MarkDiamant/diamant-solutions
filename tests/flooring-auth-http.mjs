import test from "node:test";
import assert from "node:assert/strict";
const base=(process.env.BMS_TEST_BASE_URL||"https://bms.diamantsolutions.co.uk").replace(/\/$/,"");
const supabase="https://iepqggrfenfqrqyzqyed.supabase.co";
async function getToken(){
 if(process.env.BMS_TEST_ACCESS_TOKEN)return process.env.BMS_TEST_ACCESS_TOKEN;
 const email=process.env.BMS_TEST_EMAIL,password=process.env.BMS_TEST_PASSWORD,key=process.env.BMS_TEST_SUPABASE_PUBLISHABLE_KEY;
 if(!email||!password||!key)throw Error("Protected dedicated fictional-demo manager credentials are required");
 const r=await fetch(supabase+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error("Dedicated demo manager authentication failed");
 const data=await r.json();if(!data.access_token)throw Error("Authentication returned no token");
 return data.access_token;
}
async function probe(token){
 const r=await fetch(base+"/api/bms-demo/flooring-actions",{method:"POST",headers:{"Content-Type":"application/json",Origin:base,Cookie:"bms_access_token="+token},body:JSON.stringify({action:"__non_mutating_auth_probe__",request_key:"auth-probe-"+Date.now().toString(36)}),signal:AbortSignal.timeout(20000)});
 return {status:r.status,data:await r.json().catch(()=>({}))};
}
test("dedicated manager session is authorised without mutating demo data",async()=>{
 const token=await getToken();
 const result=await probe(token);
 assert.equal(result.status,400,"Expected authorised manager to reach unsupported-action validation, not 403");
 assert.equal(result.data.error,"Unsupported demo action");
});
test("invalid token cannot reach demo mutation handlers",async()=>{
 const result=await probe("invalid-fictional-test-token");
 assert.equal(result.status,403);
});
