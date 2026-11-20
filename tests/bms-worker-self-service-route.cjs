const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),ts=require('typescript'),{NextResponse}=require('next/server');
const source=fs.readFileSync('app/api/bms-live/[...path]/route.ts','utf8');
const tenant='11111111-1111-4111-8111-111111111111',worker='22222222-2222-4222-8222-222222222222',job='33333333-3333-4333-8333-333333333333';let calls=[],open=true,breaks=[],writes=[],assigned=true,role='worker',status='active';
const response=x=>({ok:true,json:async()=>x});
async function centralRest(path,opts={}){calls.push({path,method:opts.method||'GET'});const b=opts.body?JSON.parse(opts.body):null;
 if(path.startsWith('business_software_tenant_settings?'))return response([{app_config:{onboarding:{approved:true},modules:{workforce:true}}}]);
 if(path.startsWith('rpc/bms_verify_worker_location')){assert.equal(b.p_tenant,tenant);assert.equal(b.p_worker,worker);return response('verified')}
 if(b){assert.equal(b.tenant_id||tenant,tenant);if(b.worker_id)assert.equal(b.worker_id,worker);writes.push({path,method:opts.method,body:b});if(path==='business_software_worker_attendance_breaks'){const r={id:'break1',...b};breaks.push(r);return response([r])}if(path.startsWith('business_software_worker_attendance_breaks?')){assert(path.includes('tenant_id=eq.'+tenant));breaks=breaks.map(x=>({...x,...b}));return response(breaks)}return response([{id:'saved1',...b}])}
 assert(path.includes('tenant_id=eq.'+tenant),'tenant bound read');if(/worker_(attendance|time|updates|corrections|assignments|other_work)/.test(path))assert(path.includes('worker_id=eq.'+worker),'worker bound read');
 if(path.startsWith('business_software_worker_attendance?'))return response(open?[{id:'attendance1',started_at:'2026-11-20T08:00:00Z'}]:[]);
 if(path.startsWith('business_software_worker_attendance_breaks?'))return response(path.includes('ended_at=is.null')?breaks.filter(x=>!x.ended_at):breaks);
 if(path.startsWith('business_software_worker_assignments?'))return response(assigned?[{id:'assignment1',job_id:job}]:[]);
 return response([]);
}
const ctx={exports:{},process:{env:{}},console,Buffer,URL,URLSearchParams,Headers,Request,Response,fetch:async url=>url.endsWith('/auth/v1/user')?response({id:'auth1'}):url.endsWith('/rpc/bms_login_membership')?response({id:worker,auth_user_id:'auth1',role,status:'active',permissions:['view_own_work']}):(()=>{throw Error('External destination denied')})(),require:n=>n==='next/server'?{NextResponse}:n==='crypto'?require('crypto'):n==='next/headers'?{cookies:async()=>({get:n=>n==='bms_access_token'?{value:'synthetic-local-only'}:undefined})}:n.includes('/runtime')?{runtimeTenant:async()=>({id:tenant,status,data_backend:'central'})}:n.includes('/db')?{centralRest,centralAuth:async()=>{throw Error('No auth effects')},centralStorage:async()=>{throw Error('No storage effects')}}:n.endsWith('/permissions')?{ALL_PERMISSIONS:['view_own_work']}:n.includes('invoice-email')?{invoiceEmailBody:()=>''}:(()=>{throw Error('Unexpected module '+n)})()};
vm.createContext(ctx);vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,ctx);
const post=async(p,b={})=>{calls=[];writes=[];const r=await ctx.exports.POST(new Request('https://fictional.invalid/api/admin/'+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}),{params:Promise.resolve({path:p.split('/')})});return {status:r.status,body:await r.json()}};
(async()=>{
 assert.equal((await post('worker/break',{action:'lunch',worker_id:'spoof',tenant_id:'spoof'})).status,201);assert.equal(writes[0].body.worker_id,worker);assert.equal(writes[0].body.tenant_id,tenant);
 assert.equal((await post('worker/break',{action:'other'})).status,409);assert.equal(writes.length,0);
 assert.equal((await post('worker/break',{action:'resume'})).status,200);assert(writes[0].path.includes('worker_id=eq.'+worker));
 assert.equal((await post('worker/break',{action:'lunch'})).status,409);assert.equal(writes.length,0);
 assert.equal((await post('worker/break',{action:'bad'})).status,400);
 open=false;assert.equal((await post('worker/break',{action:'other'})).status,409);assert.equal(writes.length,0);open=true;
 assert.equal((await post('worker/other-work',{activity:'Warehouse',description:'Synthetic non-job task',worker_id:'spoof'})).status,201);assert.equal(writes[0].body.worker_id,worker);
 assert.equal((await post('worker/other-work',{description:''})).status,400);assert.equal(writes.length,0);
 assert.equal((await post('worker/other-work',{description:'x'.repeat(501)})).status,400);
 const time={job_id:job,work_type:'fitting',started_at:'2026-11-20T09:00:00Z',ended_at:'2026-11-20T10:00:00Z',worker_id:'spoof'};
 assert.equal((await post('worker/time',time)).status,201);assert.equal(writes[0].body.worker_id,worker);
 assigned=false;assert.equal((await post('worker/time',time)).status,403);assert.equal(writes.length,0);assigned=true;
 assert.equal((await post('worker/time',{...time,ended_at:time.started_at})).status,400);
 open=false;assert.equal((await post('worker/attendance',{action:'clock_in'})).status,400);assert.equal(writes.length,0);
 assert.equal((await post('worker/attendance',{action:'clock_in',latitude:51.5,longitude:-0.1,accuracy_m:10,captured_at:new Date().toISOString()})).status,201);assert.equal(writes[0].body.worker_id,worker);
 for(const path of ['users','worker/site-location','worker/budget','payments/void','integrations/google/connect']){assert.equal((await post(path,{})).status,403);assert.equal(writes.length,0)}
 status='suspended';assert.equal((await post('worker/other-work',{description:'test'})).status,403);assert.equal(calls.length,0);
 console.log('PASS actual shared route: worker lunch/resume/other-work, one lunch/open-break/no-attendance/invalid guards, tenant+worker spoof protection, assigned-only time, fresh-GPS clock-in, suspended tenant and manager-only/user/payment/integration denial. All adapters synthetic; no external effects.');
})().catch(e=>{console.error(e);process.exit(1)});
