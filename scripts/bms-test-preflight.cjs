"use strict";
const assert=require("node:assert/strict");
const {URL}=require("node:url");
function preflight(env=process.env){
 const errors=[],warnings=[];
 const get=(k)=>String(env[k]||"").trim();
 const required=["DS_SUPABASE_URL","DS_SUPABASE_SERVICE_ROLE_KEY","NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","STRIPE_SECRET_KEY","STRIPE_BMS_SEATS_WEBHOOK_SECRET","BMS_STRIPE_BASE_PRICE_ID","BMS_STRIPE_SEAT_PRICE_ID","BMS_TEST_OWNER_EMAIL","BMS_TEST_OWNER_PASSWORD","BMS_TEST_TENANT_SLUG"];
 for(const k of required)if(!get(k))errors.push(k+": missing");
 for(const k of ["BMS_STRIPE_TEST_MONTHLY_BASE_PRICE_ID","BMS_STRIPE_TEST_MONTHLY_EXTRA_PRICE_ID","BMS_STRIPE_TEST_MONTHLY_AI_PRICE_ID","BMS_STRIPE_TEST_ANNUAL_BASE_PRICE_ID","BMS_STRIPE_TEST_ANNUAL_EXTRA_PRICE_ID","BMS_STRIPE_TEST_ANNUAL_AI_PRICE_ID"])if(!get(k)||!get(k).startsWith("price_"))errors.push(k+": missing test-mode price ID");
 for(const k of ["DS_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_URL"]){
  if(!get(k))continue;
  try{const u=new URL(get(k));if(u.protocol!=="https:"||!u.hostname.endsWith(".supabase.co"))errors.push(k+": must be HTTPS Supabase project URL");}catch{errors.push(k+": invalid URL")}
 }
 if(get("DS_SUPABASE_URL")&&get("NEXT_PUBLIC_SUPABASE_URL")&&get("DS_SUPABASE_URL")!==get("NEXT_PUBLIC_SUPABASE_URL"))errors.push("Supabase server/public URLs must identify same isolated project");
 const banned=["iepqggrfenfqrqyzqyed","diiqajrvlalkggjlutyn"];
 for(const k of ["DS_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_URL"])if(banned.some(ref=>get(k).includes(ref)))errors.push(k+": known production project is prohibited");
 if(get("DS_SUPABASE_URL").includes("YOUR-ISOLATED-REF")||get("STRIPE_SECRET_KEY")==="sk_test_REPLACE"||get("BMS_TEST_OWNER_PASSWORD")==="REPLACE_WITH_DISPOSABLE_PASSWORD")errors.push("Replace example fixture placeholders before running live acceptance");
 if(get("BMS_TEST_ISOLATED")!=="true")errors.push("BMS_TEST_ISOLATED must explicitly equal true");
 if(get("VERCEL_ENV")==="production"||get("NODE_ENV")==="production"&&get("BMS_TEST_ALLOW_PRODUCTION_RUNTIME")!=="true")errors.push("Refusing production runtime; use isolated Preview or local test process");
 if(!get("RESEND_API_KEY"))errors.push("RESEND_API_KEY: missing isolated Preview sending credential");
 if(!get("STRIPE_WEBHOOK_SECRET"))errors.push("STRIPE_WEBHOOK_SECRET: missing checkout webhook signing secret");
 if(get("STRIPE_WEBHOOK_SECRET")&&!get("STRIPE_WEBHOOK_SECRET").startsWith("whsec_"))errors.push("STRIPE_WEBHOOK_SECRET must be whsec_");
 if(get("STRIPE_WEBHOOK_SECRET")&&get("STRIPE_WEBHOOK_SECRET")===get("STRIPE_BMS_SEATS_WEBHOOK_SECRET"))warnings.push("Verify checkout and seat webhook endpoints are intentionally sharing one signing secret");
 if(get("STRIPE_SECRET_KEY").startsWith("sk_live_"))errors.push("Live Stripe keys are prohibited");
 const expectedRef=get("BMS_TEST_SUPABASE_PROJECT_REF");
 if(expectedRef){
  if(!/^[a-z]{20}$/.test(expectedRef))errors.push("BMS_TEST_SUPABASE_PROJECT_REF: invalid project reference");
  for(const k of ["DS_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_URL"])if(get(k)&&!get(k).startsWith("https://"+expectedRef+".supabase.co"))errors.push(k+": does not match explicitly approved isolated project");
 }else errors.push("BMS_TEST_SUPABASE_PROJECT_REF: missing explicit isolated project pin");
 for(const k of ["BMS_STRIPE_TEST_MONTHLY_BASE_PRICE_ID","BMS_STRIPE_TEST_MONTHLY_EXTRA_PRICE_ID","BMS_STRIPE_TEST_ANNUAL_BASE_PRICE_ID","BMS_STRIPE_TEST_ANNUAL_EXTRA_PRICE_ID"])if(get(k)&&!get(k).startsWith("price_"))errors.push(k+": invalid Stripe price ID");
 if(get("BMS_STRIPE_TEST_MONTHLY_BASE_PRICE_ID")&&get("BMS_STRIPE_TEST_MONTHLY_BASE_PRICE_ID")===get("BMS_STRIPE_TEST_ANNUAL_BASE_PRICE_ID"))errors.push("Monthly and annual base prices must differ");
 if(get("STRIPE_SECRET_KEY")&&!get("STRIPE_SECRET_KEY").startsWith("sk_test_"))errors.push("STRIPE_SECRET_KEY must be sk_test_");
 if(get("STRIPE_BMS_SEATS_WEBHOOK_SECRET")&&!get("STRIPE_BMS_SEATS_WEBHOOK_SECRET").startsWith("whsec_"))errors.push("Stripe webhook signing secret must be whsec_");
 for(const k of ["BMS_STRIPE_BASE_PRICE_ID","BMS_STRIPE_SEAT_PRICE_ID"])if(get(k)&&!get(k).startsWith("price_"))errors.push(k+": expected Stripe price ID");
 if(get("BMS_STRIPE_BASE_PRICE_ID")&&get("BMS_STRIPE_BASE_PRICE_ID")===get("BMS_STRIPE_SEAT_PRICE_ID"))errors.push("Base and seat price IDs must differ");
 if(get("BMS_TEST_OWNER_EMAIL")&&!get("BMS_TEST_OWNER_EMAIL").endsWith(".test")&&!get("BMS_TEST_OWNER_EMAIL").endsWith(".invalid"))warnings.push("Use a disposable test-only email address");
 if(get("BMS_TEST_TENANT_SLUG")&&!/^test-[a-z0-9-]{4,60}$/.test(get("BMS_TEST_TENANT_SLUG")))errors.push("Test tenant slug must begin test- and contain only lowercase letters, digits and hyphens");
 if(get("SUPABASE_URL")&&get("DS_SUPABASE_URL")&&get("SUPABASE_URL")!==get("DS_SUPABASE_URL"))errors.push("SUPABASE_URL fallback points at another project");
 if(get("SUPABASE_SERVICE_ROLE_KEY")&&get("DS_SUPABASE_SERVICE_ROLE_KEY")&&get("SUPABASE_SERVICE_ROLE_KEY")!==get("DS_SUPABASE_SERVICE_ROLE_KEY"))errors.push("Supabase service-role fallback differs from isolated key");
 return {ok:errors.length===0,errors,warnings};
}
if(require.main===module){
 const result=preflight();for(const e of result.errors)console.error("BLOCKED:",e);for(const w of result.warnings)console.warn("WARNING:",w);
 console.log(result.ok?"Isolated BMS test configuration passes static checks. No external calls were made.":"Isolated BMS test configuration is NOT ready.");
 process.exitCode=result.ok?0:1;
}
module.exports={preflight};
