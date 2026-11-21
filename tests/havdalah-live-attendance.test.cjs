const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('lib/havdalahLiveAttendance.js','utf8').replace('export async function','async function');
const {getLiveAttendance}=vm.runInNewContext(source+';({getLiveAttendance})',{Buffer,AbortSignal,Date,Map,Set,Error,fetch:()=>{throw Error('Unexpected network')}});
const sid='AC'+'0'.repeat(32),room='CF'+'1'.repeat(32),name='havdalah-fictional-2026-11-21';
function run({participants=[],status=200,page=null,unknown=false,config=true}={}){const urls=[];return {urls,promise:getLiveAttendance({sid:config?sid:null,key:'fictional',secret:'fictional',fetcher:async(url,options)=>{urls.push(url);assert.equal(options.method,undefined);assert.equal(options.cache,'no-store');if(url.includes('Participants'))return {ok:status===200,json:async()=>({participants,next_page_uri:page})};return {ok:true,json:async()=>({conferences:url.includes('Status=init')?[{sid:room,friendly_name:name}]:[],next_page_uri:null})};}})}}
test('waiting init conference counted and provider status lists explicit',async()=>{const {urls,promise}=run({participants:[{label:'listener-CA1',call_sid:'CA1'},{label:'host-live',call_sid:'CA2'}]});const result=await promise;assert.equal(result.listeners,1);assert.equal(result.hosts,1);assert.ok(urls.some(x=>x.includes('Status=init')));assert.ok(urls.some(x=>x.includes('Status=in-progress')));assert.equal(result.sessions[name].listeners,1);});
test('empty confirmed snapshot is zero',async()=>assert.equal((await run().promise).listeners,0));
test('duplicate participant calls are deduplicated',async()=>assert.equal((await run({participants:[{label:'listener-1',call_sid:'CA1'},{label:'listener-1',call_sid:'CA1'}]}).promise).listeners,1));
test('provider failure does not claim zero',async()=>assert.rejects(run({status:503}).promise));
test('truncated provider response does not claim completeness',async()=>assert.rejects(run({page:'/next'}).promise));
test('unknown role does not silently omit caller',async()=>assert.rejects(run({participants:[{label:'unknown',call_sid:'CA1'}]}).promise));
test('missing credentials fail closed',async()=>assert.rejects(run({config:false}).promise));
test('route authorizes before live reads and bypasses expiry write',()=>{const route=fs.readFileSync('app/api/havdalah/admin/route.js','utf8');assert.ok(route.indexOf('const a=await access(req)')<route.indexOf("query.get('live_attendance')"));assert.ok(route.indexOf("query.get('live_attendance')")<route.indexOf('expiryError'));});
