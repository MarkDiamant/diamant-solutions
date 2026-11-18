const {chromium}=require('@playwright/test'),{spawn}=require('node:child_process'),fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict'),model=require('../lib/bms-onboarding-model.cjs');
const port=3187,origin='http://127.0.0.1:'+port;
const user={id:'33333333-3333-4333-8333-333333333333',email:'admin@example.invalid',aud:'authenticated',role:'authenticated'};
const tenant='11111111-1111-4111-8111-111111111111',bmsTenant='22222222-2222-4222-8222-222222222222';
const answers={moduleDecision:'help',businessName:'Fictional Flooring',contactName:'Test Owner',email:'owner@example.invalid',phone:'000',businessType:'Flooring',users:'7'};
for(const p of model.questionnaireSteps(answers))for(const[k]of p.fields)if(!['logo','website','colours','optionalModules'].includes(k)&&!answers[k])answers[k]='Discuss during setup';
let reviewRows=[];const rpcCalls=[],onboardingWrites=[],otherCalls=[];
const mock=http.createServer((req,res)=>{
 const u=req.url||'';const json=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body))};
 if(u.startsWith('/auth/v1/user'))return json(user);
 if(u.includes('/rest/v1/internal_admins'))return json([{user_id:user.id}]);
 if(u.includes('/rest/v1/onboarding')){
  if(req.method==='PATCH'||req.method==='POST')onboardingWrites.push(req.method);
  return json([{tenant_id:tenant,status:'awaiting_clarification',progress:93,answers,proposed_config:{version:2,completion:{needsClarification:true,unresolvedQuestions:[{key:'jobStages',label:'What are your job stages?'}]}},plan_selection:{users:1},logo_path:null,submitted_at:'2026-11-17T10:00:00Z',updated_at:'2026-11-18T10:00:00Z',tenants:{name:'Fictional Flooring',slug:'fictional'}}]);
 }
 if(u.includes('/rest/v1/business_software_onboarding_reviews'))return json(reviewRows);
 if(u.includes('/rest/v1/checkout_orders'))return json([{id:'22222222-2222-4222-8222-222222222222',stripe_subscription_id:'sub_1',stripe_customer_id:'cus_1',users:1,ai_included:true}]);
 if(u.includes('/rest/v1/rpc/bms_prepare_draft_onboarding_tenant')){rpcCalls.push('draft');reviewRows=[{tenant_id:tenant,applied_bms_tenant_id:bmsTenant,approved_at:null}];return json(bmsTenant);}
 if(u.includes('/rest/v1/rpc/')){otherCalls.push(u);return json({message:'unexpected rpc'},400);}
 if(u.startsWith('/v1/subscriptions/'))return json({id:'sub_1',status:'active',customer:'cus_1',metadata:{service_type:'business_software'},collection_method:'charge_automatically',currency:'gbp',pending_update:null,cancel_at_period_end:false,items:{has_more:false,data:[{price:{id:'price_fic_base',currency:'gbp',recurring:{interval:'month',interval_count:1},unit_amount:4900},quantity:1}]}});
 if(u.startsWith('/v1/prices/')){const pid=u.split('/').pop();const amounts={price_fic_base:4900,price_fic_ai:1500,price_fic_extra:1000};return json({id:pid,active:true,currency:'gbp',recurring:{interval:'month',interval_count:1,usage_type:'licensed'},unit_amount:amounts[pid]||4900});}
 otherCalls.push(u);return json({},404);
});
const log=fs.openSync('/tmp/draft-visual-server.log','w');
let server,browser;(async()=>{
 await new Promise(r=>mock.listen(4199,'127.0.0.1',r));
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--port',String(port)],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,DS_SUPABASE_URL:'http://127.0.0.1:4199',NEXT_PUBLIC_SUPABASE_URL:'https://fictionaltest123.supabase.co',DS_SUPABASE_SERVICE_ROLE_KEY:'fictional-service-key',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fictional-public-test-key',STRIPE_SECRET_KEY:'sk_test_fictional',STRIPE_API_BASE:'http://127.0.0.1:4199',BMS_ORIGINAL_BASE_PRICE_ID:'price_fic_base',BMS_ORIGINAL_EXTRA_PRICE_ID:'price_fic_extra',BMS_ORIGINAL_AI_PRICE_ID:'price_fic_ai',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore',log,log]});
 for(let i=0;i<120;i++){try{if((await fetch(origin+'/internal/bms-onboarding')).ok)break}catch{}await new Promise(r=>setTimeout(r,500))}
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:1000}});
 const denied=[];
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1')return route.continue();
  if(u.hostname==='fictionaltest123.supabase.co')return route.fulfill({json:{}});
  denied.push(u.hostname);return route.abort();
 });
 await context.addInitScript(({user})=>{localStorage.setItem('sb-fictionaltest123-auth-token',JSON.stringify({access_token:'fictional-test-session',refresh_token:'fictional-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));},{user});
 const page=await context.newPage();
 await page.goto(origin+'/internal/bms-onboarding');
 await page.getByText('Client onboarding reviews').waitFor({timeout:60000});
 await page.getByRole('heading',{name:'Fictional Flooring'}).waitFor({timeout:30000});
 const draftButton=page.getByRole('button',{name:'Prepare draft tenant'});
 await draftButton.waitFor();
 await page.screenshot({path:'/tmp/draft-before.png',fullPage:true});
 assert.equal(await page.getByRole('button',{name:'Prepare paid tenant for review'}).count(),0,'gated prepare button hidden while status is awaiting_clarification');
 await draftButton.click();
 await page.getByText('Draft tenant prepared:').waitFor({timeout:30000});
 assert.equal(rpcCalls.length,1,'draft rpc called exactly once');
 assert.equal(onboardingWrites.length,0,'client questionnaire left untouched');
 assert.equal(otherCalls.length,0,'no unexpected backend calls: '+otherCalls.join(','));
 await page.screenshot({path:'/tmp/draft-after.png',fullPage:true});
 const body=await page.textContent('main');
 assert(body.includes(bmsTenant),'draft tenant id shown');
 assert(body.includes('suspended, not activated'),'draft state explained');
 assert(denied.every(x=>!x.includes('resend')&&!x.includes('stripe')),'no email or billing hosts contacted: '+denied.join(','));
 console.log('PASS: draft tenant preparation UI flow - button shown with unresolved answers, suspended draft created via rpc, no activation/email/billing/status writes.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)server.kill('SIGTERM');mock.close();});
