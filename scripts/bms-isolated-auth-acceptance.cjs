"use strict";
// Opt-in authenticated acceptance against an isolated Preview only. No writes or subscriptions.
const {preflight}=require("./bms-test-preflight.cjs");
async function run(env=process.env,fetcher=global.fetch){
 const check=preflight(env);const authOnlyErrors=check.errors.filter(error=>!/^STRIPE_|^BMS_STRIPE_|^BMS_CREATE_TEST_PRICES/.test(error));for(const key of ["BMS_TEST_OWNER_EMAIL","BMS_TEST_OWNER_PASSWORD","NEXT_PUBLIC_SUPABASE_ANON_KEY","BMS_TEST_PREVIEW_URL"])if(!String(env[key]||"").trim())authOnlyErrors.push(key+": missing");if(authOnlyErrors.length)throw Error([...new Set(authOnlyErrors)].join("; "));
 const base=String(env.BMS_TEST_PREVIEW_URL||"");const url=new URL(base);
 if(url.protocol!=="https:"||!url.hostname.endsWith(".vercel.app"))throw Error("BMS_TEST_PREVIEW_URL must be an isolated vercel.app Preview hostname, never a production domain");
 const sb=env.DS_SUPABASE_URL;const anon=env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const login=await fetcher(sb+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"Content-Type":"application/json",apikey:anon},body:JSON.stringify({email:env.BMS_TEST_OWNER_EMAIL,password:env.BMS_TEST_OWNER_PASSWORD})});
 const session=await login.json().catch(()=>({}));if(!login.ok||!session.access_token||!session.refresh_token)throw Error("Disposable Supabase Auth login failed: "+String(session.error_description||session.msg||login.status));
 const auth={Authorization:"Bearer "+session.access_token};
 const user=await fetcher(sb+"/auth/v1/user",{headers:{...auth,apikey:anon}});if(!user.ok)throw Error("Authenticated user retrieval failed");
 const identity=await user.json();if(String(identity.email||"").toLowerCase()!==String(env.BMS_TEST_OWNER_EMAIL).toLowerCase())throw Error("Authenticated user does not match disposable test owner");
 const session2=await fetcher(sb+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"Content-Type":"application/json",apikey:anon},body:JSON.stringify({refresh_token:session.refresh_token})});
 const refreshed=await session2.json().catch(()=>({}));if(!session2.ok||!refreshed.access_token)throw Error("Session refresh failed");
 const launchUrl=new URL("/api/onboarding/launch",base);if(env.BMS_TEST_CHECKOUT_TENANT_ID)launchUrl.searchParams.set("tenantId",env.BMS_TEST_CHECKOUT_TENANT_ID);
 const launch=await fetcher(launchUrl,{headers:{Authorization:"Bearer "+refreshed.access_token},redirect:"manual"});
 const body=await launch.json().catch(()=>({}));if(![200,401,403].includes(launch.status))throw Error("Onboarding launch unexpected status "+launch.status);
 if(launch.status===401)throw Error("Preview rejected valid disposable Supabase Auth session; verify Preview keys and URL");
 if(body.ready&&(!body.url||!String(body.url).endsWith(".diamantsolutions.co.uk/login")))throw Error("Unsafe first-login tenant URL");
 const other=new URL("/api/onboarding/launch?tenantId=00000000-0000-4000-8000-000000000000",base);
 const isolated=await fetcher(other,{headers:{Authorization:"Bearer "+refreshed.access_token},redirect:"manual"});const isolatedBody=await isolated.json().catch(()=>({}));
 if(isolatedBody.ready)throw Error("Cross-tenant first login unexpectedly allowed");
 return {auth:"PASS",refresh:"PASS",onboarding_launch:body.ready?"READY":"AWAITING_APPROVAL_OR_TENANT",cross_tenant:"PASS",stripe_checkout:"NOT_RUN_NO_CHARGES",writes:0};
}
if(require.main===module)run().then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error("ISOLATED ACCEPTANCE FAILED:",e.message);process.exitCode=1});
module.exports={run};
