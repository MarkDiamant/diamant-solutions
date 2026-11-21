import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {updateRecoveredPassword} from '../lib/business-software/recovered-password.mjs';
const token='fictional-in-memory-session-token';
function fixture(change={}) {
 const calls=[]; let host;
 const config={active:true,valid:true,member:true,save:true,idMatch:true,...change};
 const deps={tenantRecord:async(_,h)=>{host=h;return config.active?{id:'tenant-fixture',status:'active'}:null},fetcher:async(url,options)=>{
  calls.push({url,options});
  assert.equal(options.headers.apikey.startsWith('sb_publishable_'),true);
  assert.equal(options.headers.Authorization,'Bearer '+token);
  assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
  if(url.endsWith('/rpc/bms_recovery_membership'))return new Response(JSON.stringify(config.member?('memberResult' in config ? config.memberResult : {id:'member-fixture',email:'owner@fictional.invalid',role:'admin',status:'active'}):null),{status:200});
  assert(url.endsWith('/auth/v1/user'));assert(!url.includes('admin'));
  if(options.method==='PUT') { if(config.throwAfterSave)throw Error('synthetic transport interruption');return new Response(JSON.stringify({id:config.idMatch?'user-fixture':'wrong-user'}),{status:config.save?200:422}); }
  return new Response(JSON.stringify(config.valid?{id:'user-fixture',email:'owner@fictional.invalid'}:{}),{status:config.valid?200:401});
 }};
 const run=(overrides={},origin='https://tenant.fixture.invalid')=>updateRecoveredPassword(new Request('https://tenant.fixture.invalid/api/business-software/recover-password',{method:'POST',headers:{origin,'Content-Type':'application/json','x-forwarded-host':'other.fixture.invalid'},body:JSON.stringify({access_token:token,password:'synthetic-fixture-only',...overrides})}),deps);
 return {run,calls,getHost:()=>host};
}
test('provider-owned update verifies user and actual host membership, never admin or cookies',async()=>{const f=fixture();const r=await f.run();assert.equal(r.status,200);assert.equal(f.getHost(),'tenant.fixture.invalid');assert.equal(f.calls.length,3);assert.equal(JSON.parse(f.calls[1].options.body).p_tenant,'tenant-fixture');assert.deepEqual(JSON.parse(f.calls[2].options.body),{password:'synthetic-fixture-only'});assert.deepEqual(r.body,{ok:true,login:'/login'});assert(!JSON.stringify(r).includes(token));});
test('bad origin and short password fail before provider access',async()=>{const f=fixture();assert.equal((await f.run({},'https://other.fixture.invalid')).status,403);assert.equal((await f.run({password:'short'})).status,400);assert.equal(f.calls.length,0)});
test('unavailable tenant fails before provider access',async()=>{const f=fixture({active:false});assert.equal((await f.run()).status,403);assert.equal(f.calls.length,0)});
test('expired provider token is not a password update authority',async()=>{const f=fixture({valid:false});assert.equal((await f.run()).status,401);assert.equal(f.calls.length,1)});
test('foreign or missing membership prevents password write',async()=>{const f=fixture({member:false});assert.equal((await f.run()).status,403);assert.equal(f.calls.length,2)});
test('provider password rejection is not success',async()=>{const f=fixture({save:false});assert.equal((await f.run()).status,409)});
test('mismatched result and transport interruption cannot claim no password changed',async()=>{for(const change of [{idMatch:false},{throwAfterSave:true}]){const f=fixture(change);const r=await f.run();assert.equal(r.status,503);assert(!r.body.error.includes('No password'));}});
test('source contract: memory-only callback, no BMS cookies, narrow middleware allowance',()=>{const ui=fs.readFileSync('app/bms-recover-password/page.tsx','utf8'),route=fs.readFileSync('app/api/business-software/recover-password/route.ts','utf8'),mw=fs.readFileSync('middleware.ts','utf8');assert(ui.indexOf('window.history.replaceState')<ui.indexOf("setToken(access)"));assert(ui.includes("credentials:'omit'"));assert(!/localStorage\.|sessionStorage\.|document.cookie|console\./.test(ui));assert(!/cookies\.set|centralAuth|centralRest/.test(route));assert(mw.indexOf('if(path==="/bms-recover-password"')<mw.indexOf('// Workers cannot'));assert(route.includes("'Cache-Control':'no-store'"));});

test('malformed and mismatched membership payloads fail closed before write',async()=>{for(const memberResult of [[],{},true,'member',0,{id:'m',role:'admin',status:'suspended',email:'owner@fictional.invalid'},{id:'m',role:'admin',status:'active',email:'other@fictional.invalid'},{id:'m',status:'active',email:'owner@fictional.invalid'}]){const f=fixture({memberResult});assert.equal((await f.run()).status,403);assert.equal(f.calls.length,2);}});
