const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");
const vm=require("node:vm");
const crypto=require("node:crypto");
const src=fs.readFileSync(require("node:path").join(__dirname,"../app/api/bms-live/[...path]/route.ts"),"utf8");
const start=src.indexOf("async function xeroRequest("),end=src.indexOf("\nasync function createBmsInvoice(",start);
assert.ok(start>=0&&end>start);
const code=ts.transpileModule(src.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const tenant="11111111-1111-4111-8111-111111111111";
function setup({connected=true,expired=false,scope=true,refreshOk=true,saveOk=true,apiStatus=200,rateLimit=false}={}){
 const calls=[];let apiAttempts=0;
 const integration={external_tenant_id:"fictional-xero-organisation",access_token_ciphertext:"token",refresh_token_ciphertext:"refresh",token_expires_at:expired?new Date(Date.now()-1000).toISOString():new Date(Date.now()+600000).toISOString(),scopes:scope?["accounting.banktransactions.read"]:[]};
 const response=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json",...headers}});
 const centralRest=async(path,opts={})=>{calls.push({kind:"db",path,method:opts.method||"GET"});if(opts.method==="PATCH")return response({},saveOk?200:500);return response(connected?[integration]:[])};
 const fetch=async(url,opts)=>{calls.push({kind:"external",url,opts});if(url.startsWith("https://identity.xero.com"))return response(refreshOk?{access_token:"refreshed",refresh_token:"rotated",expires_in:1800}:{error:"invalid_grant"},refreshOk?200:401);if(!url.startsWith("https://api.xero.com"))throw Error("unexpected external URL");apiAttempts++;if(rateLimit&&apiAttempts===1)return response({Message:"Too many requests"},429,{"retry-after":"0.01"});return response(apiStatus===200?{Invoices:[{InvoiceID:"fictional-invoice"}]}:{Message:"fictional Xero API error"},apiStatus);};
 const context=vm.createContext({centralRest,fetch,decryptSecret:x=>x,encryptSecret:x=>x,process:{env:{XERO_CLIENT_ID:"fictional",XERO_CLIENT_SECRET:"fictional"}},Buffer,Date,JSON,Number,String,Error,URLSearchParams,encodeURIComponent,crypto,setTimeout,Promise});
 vm.runInContext(code,context);
 return {run:(path="Invoices")=>vm.runInContext("xeroRequest("+JSON.stringify(tenant)+","+JSON.stringify(path)+")",context),calls,get attempts(){return apiAttempts}};
}
test("disconnected Xero rejects before any external call",async()=>{const x=setup({connected:false});await assert.rejects(x.run(),/Connect the Xero organisation/);assert.equal(x.calls.some(c=>c.kind==="external"),false);});
test("bank transaction scope is mandatory",async()=>{const x=setup({scope:false});await assert.rejects(x.run("BankTransactions"),/permission is missing/);assert.equal(x.calls.some(c=>c.kind==="external"),false);});
test("expired token refresh rotates and saves credentials before invoice GET",async()=>{const x=setup({expired:true});const v=await x.run();assert.equal(v.Invoices[0].InvoiceID,"fictional-invoice");assert.equal(x.calls.filter(c=>c.kind==="external").length,2);assert.ok(x.calls.some(c=>c.kind==="db"&&c.method==="PATCH"));});
test("refresh failure rejects without querying accounting API",async()=>{const x=setup({expired:true,refreshOk:false});await assert.rejects(x.run(),/token refresh failed/);assert.equal(x.calls.some(c=>c.url?.startsWith("https://api.xero.com")),false);});
test("failed token persistence rejects before accounting API",async()=>{const x=setup({expired:true,saveOk:false});await assert.rejects(x.run(),/save refreshed Xero credentials/);assert.equal(x.calls.some(c=>c.url?.startsWith("https://api.xero.com")),false);});
test("Xero API validation failure surfaces a useful error",async()=>{const x=setup({apiStatus:400});await assert.rejects(x.run(),/fictional Xero API error/);});
test("read-only Xero GET retries a transient rate limit",async()=>{const x=setup({rateLimit:true});const v=await x.run();assert.equal(v.Invoices.length,1);assert.equal(x.attempts,2);});
