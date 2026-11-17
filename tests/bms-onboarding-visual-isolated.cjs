const {chromium}=require('@playwright/test'),{spawn}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict'),model=require('../lib/bms-onboarding-model.cjs');
const port=3186,origin='http://127.0.0.1:'+port;
const user={id:'33333333-3333-4333-8333-333333333333',email:'owner@example.invalid',aud:'authenticated',role:'authenticated'},tenant='11111111-1111-4111-8111-111111111111';
const answer={businessName:'Fictional Flooring',contactName:'Test Owner',email:user.email,phone:'000',businessType:'Flooring',workflow:'Discuss during setup',features:'All',users:'7',moduleDecision:'selected',optionalModules:[...model.optionalFeatureOptions]};
for(const p of model.questionnaireSteps(answer))for(const[k]of p.fields)if(!['logo','optionalModules','website','colours'].includes(k)&&!answer[k])answer[k]='Discuss during setup';
let row={tenant_id:tenant,service_type:'business_software',answers:answer,current_step:0,status:'in_progress',plan_selection:{users:1,ai:true,interval:'monthly'}};
const log=fs.openSync('/tmp/repair-visual-server.log','w');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--port',String(port)],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'https://fictionaltest123.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fictional-public-test-key',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore',log,log]});
let browser; (async()=>{for(let i=0;i<120;i++){try{if((await fetch(origin+'/setup')).ok)break}catch{}await new Promise(r=>setTimeout(r,500))}
browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1366,height:1000}});const denied=[],writes=[];
await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();if(u.hostname==='fictionaltest123.supabase.co'){
 if(u.pathname.includes('tenant_members'))return route.fulfill({json:[{tenant_id:tenant,tenants:{service_type:'business_software'}}]});
 if(u.pathname.includes('/onboarding')){if(route.request().method()==='PATCH'){row={...row,...route.request().postDataJSON()};writes.push({target:'fixture-only',method:'PATCH'});}return route.fulfill({json:row});}
 if(u.pathname.includes('/auth/v1/user'))return route.fulfill({json:user});
 return route.fulfill({json:{}});
}denied.push(u.hostname);return route.abort();});
await context.addInitScript(({user})=>{localStorage.setItem('sb-fictionaltest123-auth-token',JSON.stringify({access_token:'fictional-test-session',refresh_token:'fictional-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));},{user});
const page=await context.newPage();await page.goto(origin+'/setup');await page.getByText('Page 1 of 14: Your business').waitFor({timeout:30000});
for(let i=0;i<13;i++){await page.getByText(`Page ${i+1} of 14: ${model.questionnaireSteps(answer)[i].title}`,{exact:true}).waitFor();if(i===2){await page.screenshot({path:'/tmp/repair-modules.png',fullPage:true});assert.equal(await page.getByText('Select all functions',{exact:true}).count(),1);}if(i===8)await page.screenshot({path:'/tmp/repair-stock.png',fullPage:true});await page.getByRole('button',{name:'Save & continue'}).click();}
await page.getByText('Page 14 of 14: Data import & final preferences').waitFor();await page.screenshot({path:'/tmp/repair-final.png',fullPage:true});await page.getByText('Saved online',{exact:true}).first().waitFor();
await page.reload();await page.getByText('Page 14 of 14: Data import & final preferences').waitFor();assert.equal(row.answers.stockOpening,'Discuss during setup');assert.equal(row.answers.optionalModules.length,model.optionalFeatureOptions.length);
console.log('PASS: fourteen-page all-module flow and save/reload preserve fixture answers and selection; no production requests.');
// Verify a sparse/no-module decision cannot advance page 3.
row={...row,current_step:2,answers:{...answer,moduleDecision:undefined,optionalModules:undefined}};
await page.evaluate(()=>localStorage.removeItem('ds-bms-onboarding'));await page.reload();await page.getByText('Page 3 of 6: What you need').waitFor();await page.getByRole('button',{name:'Save & continue'}).click();await page.getByRole('alert').filter({hasText:'Choose your modules'}).waitFor();await page.screenshot({path:'/tmp/repair-validation.png',fullPage:true});
console.log('PASS: no module decision blocks advance with a visible error.');
assert(denied.every(x=>!x.includes('stripe')&&!x.includes('resend')));console.log('Blocked optional external resources:',[...new Set(denied)].join(','));console.log('Fixture-only autosaves:',writes.length);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.kill('SIGTERM');});
