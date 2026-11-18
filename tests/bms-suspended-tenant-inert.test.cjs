// Inertness: a suspended (draft-prepared, not yet approved) BMS tenant must be refused
// by every verb of the live BMS API before any user or data access.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const file=path.join(__dirname,'../app/api/bms-live/[...path]/route.ts');

const suspendedTenant={id:'33333333-3333-4333-8333-333333333333',slug:'fictional-suspended',status:'suspended',business_name:'Fictional Suspended Ltd'};
const calls=[];
global.fetch=async(u)=>{calls.push(String(u));throw new Error('suspended tenant must never reach the network: '+u);};

const original=Module._load;
Module._load=function(n,...args){
 if(n==='next/server')return {NextResponse:{json:(body,{status=200}={})=>({body,status})}};
 if(n==='next/headers')return {headers:async()=>({get:k=>k==='host'?'fictional-suspended.invalid':null}),cookies:async()=>({get:()=>undefined,set:()=>{}})};
 if(n==='@/lib/business-software/runtime'||n.endsWith('/lib/business-software/runtime'))return {runtimeTenant:async()=>suspendedTenant};
 if(n==='@/lib/business-software/db'||n.endsWith('/lib/business-software/db'))return {centralAuth:async()=>{throw new Error('suspended tenant must never authenticate')},centralRest:async()=>{throw new Error('suspended tenant must never query data')},centralStorage:{}};
 if(n==='@/business-software-core/lib/invoice-email'||n.endsWith('/lib/invoice-email'))return {invoiceEmailBody:()=>''};
 return original.call(this,n,...args);
};
const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;
mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
Module._load=original;

const req=()=>new Request('https://fictional-suspended.invalid/api/bms-live/session');
const ctx={params:Promise.resolve({path:['session']})};

for(const verb of ['GET','POST','PUT','PATCH']){
 test(`suspended tenant is refused 403 on ${verb} before any user or data access`,async()=>{
  assert.equal(typeof mod.exports[verb],'function',verb+' handler exists');
  const r=await mod.exports[verb](req(),ctx);
  assert.equal(r.status,403);
  assert.match(r.body.error,/awaiting internal approval/);
  assert.equal(calls.length,0,verb+' made no network calls');
 });
}

test('tenant resolution wiring stays host-based and reads the central tenant registry',()=>{
 const runtime=fs.readFileSync(path.join(__dirname,'../lib/business-software/runtime.js'),'utf8');
 assert.match(runtime,/headers\(\)/);
 assert.match(runtime,/tenantRecord\(null,host\)/);
 const db=fs.readFileSync(path.join(__dirname,'../lib/business-software/db.js'),'utf8');
 assert.match(db,/business_software_tenants/);
 assert.match(db,/select=id,slug,business_name,canonical_host,status,billing_mode,reference_tenant/);
 const route=fs.readFileSync(file,'utf8');
 const guards=route.match(/tenant\.status==="suspended"\)return NextResponse\.json\(\{error:"Your business setup is awaiting internal approval"\},\{status:403\}\)/g)||[];
 assert.ok(guards.length>=4,'every verb guards suspended status');
});
