const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),Module=require("node:module");
const file=path.join(__dirname,"../app/api/bms-demo/stock/route.ts"),src=fs.readFileSync(file,"utf8"),js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const original=Module._load,store=new Map();
Module._load=function(name,...args){
 if(name==="next/server")return {NextResponse:{json:(body,opts={})=>({body,status:opts.status||200,cookies:{set:()=>{}}})}};
 if(name==="@/lib/business-software/demo-catalog")return {demoPriceBookFor:()=>({items:[{id:"oak-lvt",name:"Oak LVT click",cost_net:12.5,unit:"each"}]})};
 if(name==="@/lib/business-software/db")return {centralRest:async(url,opts={})=>{if(opts.method==="POST"){const body=JSON.parse(opts.body);store.set(body.session_id+":"+body.sample,structuredClone(body.payload));return {ok:true}}const id=new URL("https://fake.invalid/"+url).searchParams.get("session_id")?.slice(3),sample=new URL("https://fake.invalid/"+url).searchParams.get("sample")?.slice(3);const payload=store.get(id+":"+sample);return {ok:true,json:async()=>payload?[{payload:structuredClone(payload)}]:[]}}};
 return original.call(this,name,...args)
};const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod._compile(js,file);Module._load=original;
const session="11111111-1111-4111-8111-111111111111";
function req(action){return {headers:new Headers({"x-bms-demo-sample":"flooring"}),cookies:{get:()=>({value:session})},nextUrl:new URL("https://bms.diamantsolutions.co.uk/flooring/stock"),json:async()=>action}};
async function post(body){const r=await mod.exports.POST(req(body));assert.equal(r.status,200,JSON.stringify(r.body));return r}
test("Flooring FL101 reserve issue release return persists across requests and isolates sample",async()=>{
 const before=(await mod.exports.GET(req())).body,job=before.jobs.find(j=>j.reference==="FL101"),product=before.products[0],loc=before.locations[0];
 assert.equal(job.id,"flooring-job-2");
 await post({action:"reservation",job_id:job.id,product_id:product.id,location_id:loc.id,quantity:5});
 let d=(await mod.exports.GET(req())).body;assert.equal(d.reservations.filter(x=>x.job_id===job.id).reduce((n,x)=>n+x.quantity,0),5);
 await post({action:"pick",job_id:job.id,product_id:product.id,location_id:loc.id,quantity:2});
 d=(await mod.exports.GET(req())).body;assert.equal(d.reservations.filter(x=>x.job_id===job.id).reduce((n,x)=>n+x.quantity,0),3);
 const issue=d.consumptions.find(x=>x.job_id===job.id&&x.product_id===product.id);assert.equal(issue.quantity,2);
 await post({action:"reservation",job_id:job.id,product_id:product.id,location_id:loc.id,quantity:-1});
 await post({action:"return_job",consumption_id:issue.id,quantity:1,location_id:loc.id});
 d=(await mod.exports.GET(req())).body;assert.equal(d.reservations.filter(x=>x.job_id===job.id).reduce((n,x)=>n+x.quantity,0),2);
 assert.equal(d.returns.filter(x=>x.consumption_id===issue.id).reduce((n,x)=>n+x.quantity,0),1);
 assert.equal(d.balances.find(x=>x.product_id===product.id&&x.location_id===loc.id).reserved,2);
 assert.equal(d.movements.some(x=>x.source_type==="job_return"&&x.source_id===job.id),true);
 const other=req();other.headers.set("x-bms-demo-sample","northstar");const isolated=(await mod.exports.GET(other)).body;assert.equal(isolated.reservations.length,0);
});
