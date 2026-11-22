const ROOT=process.env.BMS_CANDIDATE_ROOT||require('path').resolve(__dirname,'..');
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),ts=require(ROOT+'/node_modules/typescript');
const source=fs.readFileSync(ROOT+'/business-software-core/components/admin/JobDetail.tsx','utf8');const start=source.indexOf('function JobMaterialsOrders('),end=source.indexOf('\nfunction Files(',start),component=source.slice(start,end);
let slots=[],at=0,effects=[],fetches=[];const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
const ctx={exports:{},console,FormData,encodeURIComponent,Error,Number,String,React:{createElement:(type,props,...children)=>({type,props:props||{},children})},JobStockPlanning:()=>null,text:()=>null,num:()=>null,iso:()=>null,
 useState:init=>{const i=at++;if(!slots[i])slots[i]={value:init};return[slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v}]},
 useRef:init=>{const i=at++;if(!slots[i])slots[i]={current:init};return slots[i]},
 useCallback:(fn,deps)=>{const i=at++;if(!slots[i]||!same(slots[i].deps,deps))slots[i]={value:fn,deps};return slots[i].value},
 useEffect:(fn,deps)=>{const i=at++;if(!slots[i]||!same(slots[i].deps,deps)){const old=slots[i];slots[i]={deps,cleanup:old?.cleanup};effects.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn()})}},
 fetch:url=>new Promise((resolve,reject)=>fetches.push({url,resolve,reject}))};
vm.createContext(ctx);vm.runInContext(ts.transpileModule(component+'\nglobalThis.Subject=JobMaterialsOrders;',{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,ctx);
const render=(id,ref)=>{at=0;return ctx.Subject({reference:ref,data:{job:{id}},canCosts:true,onAction:()=>{},config:{}})},text=t=>t==null||typeof t==='boolean'?'':typeof t==='string'||typeof t==='number'?String(t):Array.isArray(t)?t.map(text).join(''):text(t.children),flush=()=>{const q=effects;effects=[];q.forEach(f=>f())},settle=()=>new Promise(setImmediate);
const body=(id,ref)=>({complete:true,job_id:id,job_reference:ref,orders:[{id:'same-order-id',reference:ref,status:'ordered'}],lines:[{id:'same-line-id',order_id:'same-order-id',name:'New material '+ref,quantity:24,received_qty:12,unit:'pack'}],legacy_orders:[{id:'same-order-id',supplier_name:'Linked supplier '+ref,status:'ordered'}],legacy_lines:[{id:'same-line-id',material_order_id:'same-order-id',description:'Old material '+ref,ordered_quantity:8,received_quantity:4,unit:'m2'}],products:[]});
const respond=(i,b,ok=true)=>fetches[i].resolve({ok,json:async()=>b});
(async()=>{
 render('id-A','JOB_A');flush();respond(0,body('id-A','JOB_A'));await settle();let t=text(render('id-A','JOB_A'));assert(t.includes('Purchase order JOB_A'));assert(t.includes('24 pack ordered · 12 pack received'));assert(t.includes('8 m2 ordered · 4 m2 received'));assert(t.includes('Matched by saved reference'));assert(t.includes('Linked to this job'));assert.equal(new Set(slots[0].value.map(o=>o.id)).size,2);assert.equal(new Set(slots[1].value.map(l=>l.id)).size,2);
 t=text(render('id-B','JOB_B'));assert(!t.includes('JOB_A'));assert(t.includes('Loading job orders'));flush();respond(1,{error:'Simulated new-job failure'},false);await settle();t=text(render('id-B','JOB_B'));assert(t.includes('Simulated new-job failure'));assert(!t.includes('JOB_A'));assert(!t.includes('24 pack'));
 render('id-C','JOB_C');flush();render('id-D','JOB_D');flush();respond(3,body('id-D','JOB_D'));await settle();assert(text(render('id-D','JOB_D')).includes('Purchase order JOB_D'));respond(2,body('id-C','JOB_C'));await settle();t=text(render('id-D','JOB_D'));assert(t.includes('Purchase order JOB_D'));assert(!t.includes('Purchase order JOB_C'));
 render('id-E','JOB_E');flush();respond(4,body('id-D','JOB_D'));await settle();t=text(render('id-E','JOB_E'));assert(t.includes('Purchasing records unavailable for this job'));assert(!t.includes('Purchase order JOB_D'));
 assert(fetches.every(x=>x.url.startsWith('/api/bms-materials?job_orders=')&&x.url.includes('&job_id=')));
 console.log('PASS: actual candidate component suppresses prior job before effects, clears after failed reference change, ignores late old responses, rejects mismatched payload, preserves separate ID namespaces, and renders pack/m2 units');
})().catch(e=>{console.error(e);process.exit(1)});
