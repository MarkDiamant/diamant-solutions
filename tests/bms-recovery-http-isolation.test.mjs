import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {syntheticRecoveryServer} from './support/isolated-recovery-http.mjs';
import {isolatedRecoveryAdapter} from './support/isolated-recovery-adapter.mjs';
import {isolatedRecoveryHandlers} from './support/isolated-recovery-handlers.mjs';
const ref='abcdefghijklmnopqrst',origin='https://recovery-fixture.invalid',email='approved@example.test';
const config={projectUrl:'https://'+ref+'.supabase.co',expectedProjectRef:ref,publishableKey:'sb_publishable_fictional_test_key',serviceKey:'fictional-isolated-service-key-only',appOrigin:origin,approvedRecipient:email};
test('explicit injection and method/path/query fail closed before transport',async()=>{
 assert.throws(()=>isolatedRecoveryAdapter(config));assert.throws(()=>isolatedRecoveryHandlers(config));
 let calls=0;const d=isolatedRecoveryAdapter(config,async()=>{calls++;throw Error('Unexpected network');});
 for(const [path,method]of [['/auth/v1/user','POST'],['/auth/v1/recover','GET'],['/rest/v1/rpc/bms_recovery_membership','DELETE'],['/rest/v1/rpc/bms_reserve_recovery_email','GET'],['/auth/v1/admin/users','POST'],['/rest/v1/business_software_users','POST'],['/auth/v1/user?redirect=bad','GET']])await assert.rejects(d.fetcher(config.projectUrl+path,{method}));
 assert.equal(calls,0);
});
test('actual HTTP boundary with deny-default recording transport and forbidden global fetch',async()=>{
 const attempts=[];const permitted=new Map([
 ['POST /rest/v1/rpc/business_software_public_tenant',()=>[{id:'fixture',status:'active',canonical_host:new URL(origin).hostname}]],
 ['POST /rest/v1/rpc/bms_reserve_recovery_email',()=>true],
 ['POST /auth/v1/recover',()=>({})],
 ['GET /auth/v1/user',()=>({id:'identity',email})],
 ['POST /rest/v1/rpc/bms_recovery_membership',()=>({id:'member',role:'owner',status:'active',email})],
 ['PUT /auth/v1/user',()=>({id:'identity',email})]
 ]);
 const transport=async(input,init)=>{const u=new URL(input),pair=(init.method||'GET')+' '+u.pathname;attempts.push({origin:u.origin,pair});assert.equal(u.origin,config.projectUrl);assert.equal(init.redirect,'error');const fixture=permitted.get(pair);assert.ok(fixture,'unapproved egress');return Response.json(fixture());};
 const saved=globalThis.fetch;let globalAttempts=0;globalThis.fetch=()=>{globalAttempts++;throw Error('Global fetch forbidden');};
 const server=syntheticRecoveryServer(config,transport);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const send=(path,body,method='POST',headers={})=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:server.address().port,path,method,headers:{host:new URL(origin).host,origin,'content-type':'application/json',...headers}},res=>{let data='';res.on('data',x=>data+=x);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data}));});req.on('error',reject);req.end(body===undefined?'':JSON.stringify(body));});
 try{
  let r=await send('/api/business-software/request-recovery',{email});assert.equal(r.status,202);assert.equal(r.headers['cache-control'],'no-store');
  r=await send('/api/business-software/recover-password',{access_token:'fictional-bearer-at-least-20',password:'fictional-password-not-real'});assert.equal(r.status,200);assert.equal(attempts.length,7);
  for(const [path,method,headers,status]of [['/api/business-software/request-recovery','GET',{},405],['/api/business-software/request-recovery?x=1','POST',{},404],['/api/business-software/set-password','POST',{},404],['/api/business-software/recover-password','POST',{origin:'https://foreign.invalid'},403],['/api/business-software/request-recovery','POST',{host:'production.invalid'},403]]){assert.equal((await send(path,{email},method,headers)).status,status);}
  assert.equal(attempts.length,7);assert.equal(globalAttempts,0);assert.deepEqual([...new Set(attempts.map(x=>x.pair))].sort(),[...permitted.keys()].sort());
 }finally{await new Promise(r=>server.close(r));globalThis.fetch=saved;}
});
