const {test}=require("node:test"),assert=require("node:assert/strict");
const {preflight}=require("../scripts/bms-test-preflight.cjs");
const safe=()=>({DS_SUPABASE_URL:"https://fictionaltest123.supabase.co",NEXT_PUBLIC_SUPABASE_URL:"https://fictionaltest123.supabase.co",DS_SUPABASE_SERVICE_ROLE_KEY:"fictional_only",NEXT_PUBLIC_SUPABASE_ANON_KEY:"fictional_only",STRIPE_SECRET_KEY:"sk_test_fictional",STRIPE_BMS_SEATS_WEBHOOK_SECRET:"whsec_fictional",BMS_STRIPE_BASE_PRICE_ID:"price_base_test",BMS_STRIPE_SEAT_PRICE_ID:"price_seat_test",BMS_STRIPE_TEST_MONTHLY_BASE_PRICE_ID:"price_test_m_base",BMS_STRIPE_TEST_MONTHLY_EXTRA_PRICE_ID:"price_test_m_extra",BMS_STRIPE_TEST_MONTHLY_AI_PRICE_ID:"price_test_m_ai",BMS_STRIPE_TEST_ANNUAL_BASE_PRICE_ID:"price_test_a_base",BMS_STRIPE_TEST_ANNUAL_EXTRA_PRICE_ID:"price_test_a_extra",BMS_STRIPE_TEST_ANNUAL_AI_PRICE_ID:"price_test_a_ai",BMS_TEST_OWNER_EMAIL:"owner@example.invalid",BMS_TEST_OWNER_PASSWORD:"fictional-password",BMS_TEST_TENANT_SLUG:"test-fictional-tenant",BMS_TEST_ISOLATED:"true",VERCEL_ENV:"preview",NODE_ENV:"test"});
test("valid isolated Preview config passes without connecting to any service",()=>assert.equal(preflight(safe()).ok,true));
for(const [name,change] of [
 ["production Supabase project",{DS_SUPABASE_URL:"https://iepqggrfenfqrqyzqyed.supabase.co",NEXT_PUBLIC_SUPABASE_URL:"https://iepqggrfenfqrqyzqyed.supabase.co"}],
 ["production Stripe secret",{STRIPE_SECRET_KEY:"sk_live_never_use"}],
 ["missing explicit isolation",{BMS_TEST_ISOLATED:""}],
 ["production Vercel environment",{VERCEL_ENV:"production"}],
 ["different server and public project",{NEXT_PUBLIC_SUPABASE_URL:"https://other.supabase.co"}],
 ["different service-role fallback",{SUPABASE_SERVICE_ROLE_KEY:"production_key"}],
 ["same Stripe price IDs",{BMS_STRIPE_SEAT_PRICE_ID:"price_base_test"}],
 ["non-test tenant slug",{BMS_TEST_TENANT_SLUG:"real-customer"}],
 ["missing owner credentials",{BMS_TEST_OWNER_PASSWORD:""}],
])test("preflight rejects "+name,()=>assert.equal(preflight({...safe(),...change}).ok,false));
