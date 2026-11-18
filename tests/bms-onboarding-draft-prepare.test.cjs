const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const file=path.join(__dirname,'../app/api/internal/bms-onboarding/route.ts');
process.env.DS_SUPABASE_URL='https://fictional.invalid';
process.env.DS_SUPABASE_SERVICE_ROLE_KEY='fictional_only';
process.env.STRIPE_SECRET_KEY='sk_test_fictional';
const original=Module._load;Module._load=function(n,...args){if(n==='next/server')return {NextResponse:{json:(body,{status=200}={})=>({body,status})}};return original.call(this,n,...args)};
const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);Module._load=original;
const model=require('../lib/bms-onboarding-model.cjs'),tenant='11111111-1111-4111-8111-111111111111',bmsTenant='22222222-2222-4222-8222-222222222222';
const answers={moduleDecision:'help',businessName:'Fictional',contactName:'Owner',email:'owner@example.invalid',phone:'000',businessType:'Flooring',users:'7'};
for(const p of model.questionnaireSteps(answers))for(const[k]of p.fields)if(!['logo','website','colours','optionalModules'].includes(k)&&!answers[k])answers[k]='Discuss during setup';

function mockFetch({reviewRows=[],checkoutRows=[],stripeBody={status:'active',customer:'cus_1'}}={}){
 const calls=[];
 global.fetch=async(u,o={})=>{
  const url=String(u);calls.push({u:url,o});
  if(url.includes('/auth/v1/user'))return {ok:true,json:async()=>({id:tenant})};
  if(url.includes('/internal_admins'))return {ok:true,json:async()=>[{user_id:tenant}]};
  if(url.includes('/rest/v1/onboarding?'))return {ok:true,json:async()=>[{tenant_id:tenant,status:'awaiting_clarification',answers,proposed_config:{version:2,completion:{needsClarification:true}}}]};
  if(url.includes('business_software_onboarding_reviews'))return {ok:true,json:async()=>reviewRows};
  if(url.includes('checkout_orders'))return {ok:true,json:async()=>checkoutRows};
  if(url.includes('api.stripe.com'))return {ok:true,json:async()=>stripeBody};
  if(url.includes('/rpc/bms_prepare_draft_onboarding_tenant'))return {ok:true,json:async()=>bmsTenant};
  if(url.includes('/rpc/'))return {ok:false,json:async()=>({message:'unexpected rpc'})};
  throw new Error('unexpected fetch '+url);
 };
 return calls;
}
function draftRequest(){return new Request('https://fictional.invalid/api/internal/bms-onboarding',{method:'PATCH',headers:{Authorization:'Bearer fictional'},body:JSON.stringify({tenantId:tenant,action:'prepare_draft'})})}

test('draft preparation succeeds with unresolved answers and makes no activation, email or onboarding-status calls',async()=>{
 const calls=mockFetch({checkoutRows:[{stripe_subscription_id:'sub_1',stripe_customer_id:'cus_1'}]});
 const result=await mod.exports.PATCH(draftRequest());
 assert.equal(result.status,200);
 assert.equal(result.body.ok,true);
 assert.equal(result.body.draft,true);
 assert.equal(result.body.bmsTenantId,bmsTenant);
 assert(result.body.pending.unresolved>40,'reports outstanding items as still pending');
 assert(calls.some(c=>c.u.includes('/rpc/bms_prepare_draft_onboarding_tenant')),'draft rpc called');
 assert(!calls.some(c=>c.u.includes('/rpc/bms_prepare_paid_onboarding_tenant')),'paid-prepare rpc not called');
 assert(!calls.some(c=>c.u.includes('/rpc/bms_approve')),'approval rpc not called');
 assert(!calls.some(c=>c.u.includes('resend')),'no email sent');
 assert(!calls.some(c=>c.u.includes('bms_mark_activation_email')),'no activation marker');
 assert(!calls.some(c=>c.o.method==='PATCH'),'onboarding status left unchanged');
 assert(!calls.some(c=>c.o.method==='POST'&&c.u.includes('api.stripe.com')),'no stripe mutation');
});

test('draft preparation refuses an already approved setup before stripe or rpc calls',async()=>{
 const calls=mockFetch({reviewRows:[{approved_at:'2026-11-18T00:00:00Z'}],checkoutRows:[{stripe_subscription_id:'sub_1',stripe_customer_id:'cus_1'}]});
 const result=await mod.exports.PATCH(draftRequest());
 assert.equal(result.status,409);
 assert(!calls.some(c=>c.u.includes('/rpc/')),'no rpc after approved guard');
 assert(!calls.some(c=>c.u.includes('api.stripe.com')),'no stripe call after approved guard');
});

test('draft preparation requires a verified paid checkout',async()=>{
 const calls=mockFetch({checkoutRows:[]});
 const result=await mod.exports.PATCH(draftRequest());
 assert.equal(result.status,409);
 assert(!calls.some(c=>c.u.includes('/rpc/')),'no rpc without paid checkout');
});

test('draft preparation requires an active matching stripe subscription',async()=>{
 const calls=mockFetch({checkoutRows:[{stripe_subscription_id:'sub_1',stripe_customer_id:'cus_1'}],stripeBody:{status:'canceled',customer:'cus_1'}});
 const result=await mod.exports.PATCH(draftRequest());
 assert.equal(result.status,409);
 assert(!calls.some(c=>c.u.includes('/rpc/')),'no rpc for inactive subscription');
});

test('regular prepare and approval stay gated on unresolved answers',async()=>{
 const calls=mockFetch({checkoutRows:[{stripe_subscription_id:'sub_1',stripe_customer_id:'cus_1'}]});
 const prepare=await mod.exports.PATCH(new Request('https://fictional.invalid/api/internal/bms-onboarding',{method:'PATCH',headers:{Authorization:'Bearer fictional'},body:JSON.stringify({tenantId:tenant,action:'prepare'})}));
 assert.equal(prepare.status,409);
 const ready=await mod.exports.PATCH(new Request('https://fictional.invalid/api/internal/bms-onboarding',{method:'PATCH',headers:{Authorization:'Bearer fictional'},body:JSON.stringify({tenantId:tenant,status:'ready',bmsTenantId:bmsTenant})}));
 assert.equal(ready.status,409);
 assert(!calls.some(c=>c.u.includes('/rpc/')),'gated paths make no rpc calls');
});

function mockConfigFetch({reviewRows=[{approved_at:null,applied_bms_tenant_id:bmsTenant}],tenantRows=[{id:bmsTenant,status:'suspended'}],settingsRows=[{app_config:{businessName:'Fictional',plan:{includedUsers:1}}}]}={}){
 const calls=[];
 global.fetch=async(u,o={})=>{
  const url=String(u);calls.push({u:url,o,body:o.body?JSON.parse(o.body):null});
  if(url.includes('/auth/v1/user'))return {ok:true,json:async()=>({id:tenant})};
  if(url.includes('/internal_admins'))return {ok:true,json:async()=>[{user_id:tenant}]};
  if(url.includes('/rest/v1/onboarding?'))return {ok:true,json:async()=>[{tenant_id:tenant,status:'awaiting_clarification',answers,proposed_config:{version:2}}]};
  if(url.includes('business_software_onboarding_reviews'))return {ok:true,json:async()=>reviewRows};
  if(url.includes('business_software_tenants?'))return {ok:true,json:async()=>tenantRows};
  if(url.includes('business_software_tenant_settings'))return {ok:true,json:async()=>settingsRows};
  throw new Error('unexpected fetch '+url);
 };
 return calls;
}
function configRequest(config){return new Request('https://fictional.invalid/api/internal/bms-onboarding',{method:'PATCH',headers:{Authorization:'Bearer fictional'},body:JSON.stringify({tenantId:tenant,action:'configure_draft',config})})}

test('draft configuration merges whitelisted confirmed settings and preserves existing keys',async()=>{
 const calls=mockConfigFetch();
 const result=await mod.exports.PATCH(configRequest({workItemTerminology:'orders',accentColour:'#9C5F4B'}));
 assert.equal(result.status,200);
 assert.deepEqual(result.body.applied,['accentColour','workItemTerminology']);
 const write=calls.find(c=>c.u.includes('business_software_tenant_settings')&&c.o.method==='PATCH');
 assert(write,'settings written');
 assert.equal(write.body.app_config.workItemTerminology,'orders');
 assert.equal(write.body.app_config.accentColour,'#9C5F4B');
 assert.equal(write.body.app_config.businessName,'Fictional','existing settings preserved');
 assert.deepEqual(write.body.app_config.plan,{includedUsers:1},'plan/billing keys preserved');
});

test('draft configuration refuses non-draft tenants and unapproved-key writes',async()=>{
 const active=mockConfigFetch({tenantRows:[{id:bmsTenant,status:'active'}]});
 const r1=await mod.exports.PATCH(configRequest({workItemTerminology:'orders'}));
 assert.equal(r1.status,409);
 assert(!active.some(c=>c.o.method==='PATCH'),'active tenant never written by draft configuration');
 const calls=mockConfigFetch();
 const r2=await mod.exports.PATCH(configRequest({plan:{includedUsers:9},modules:{Invoices:true}}));
 assert.equal(r2.status,400);
 assert(r2.body.error.includes('plan')&&r2.body.error.includes('modules'));
 assert(!calls.some(c=>c.o.method==='PATCH'),'rejected keys produce no write');
 const r3=await mod.exports.PATCH(configRequest({accentColour:'red'}));
 assert.equal(r3.status,400,'invalid colour rejected');
});

test('draft configuration requires a prepared, unapproved draft',async()=>{
 const noDraft=mockConfigFetch({reviewRows:[{approved_at:null,applied_bms_tenant_id:null}]});
 const r1=await mod.exports.PATCH(configRequest({workItemTerminology:'orders'}));
 assert.equal(r1.status,409);
 const approved=mockConfigFetch({reviewRows:[{approved_at:'2026-11-18T00:00:00Z',applied_bms_tenant_id:bmsTenant}]});
 const r2=await mod.exports.PATCH(configRequest({workItemTerminology:'orders'}));
 assert.equal(r2.status,409);
 assert(!approved.some(c=>c.o.method==='PATCH'),'approved setup never written');
});
