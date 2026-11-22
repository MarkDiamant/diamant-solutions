const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const repo=process.env.BMS_REPO||process.cwd();
const ts=require(require.resolve('typescript',{paths:[repo]}));
const React=require(require.resolve('react',{paths:[repo]}));
const {renderToStaticMarkup}=require(require.resolve('react-dom/server',{paths:[repo]}));
const root=__dirname;
const galleryPath='business-software-core/components/admin/JobFileGallery.tsx';
const cataloguePath='app/api/business-software/catalogue/route.ts';
const gallery=fs.readFileSync(repo+'/'+galleryPath,'utf8');
const helperSource=fs.readFileSync(repo+'/lib/business-software/job-file-preview.ts','utf8');
const helper={exports:{},URL};vm.createContext(helper);vm.runInContext(ts.transpileModule(helperSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,helper);
function checkGallery(source){
 const hooks={...React,useState:init=>[typeof init==='function'?init():init,()=>{}],useEffect:()=>{},useId:()=>':fixture:',useRef:()=>({current:null})};
 const ctx={exports:{},require:n=>n==='react'?hooks:n==='react/jsx-runtime'?require(require.resolve('react/jsx-runtime',{paths:[repo]})):n.endsWith('/job-file-preview')?helper.exports:(()=>{throw Error('Unexpected import '+n)})()};
 vm.createContext(ctx);vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,ctx);
 const files=[{id:'pdf',file_name:'fictional.pdf',mime_type:'application/pdf',signed_url:'/api/admin/jobs/FICTIONAL/files?id=pdf'},{id:'photo',file_name:'fictional.jpg',mime_type:'image/jpeg',signed_url:'/api/admin/jobs/FICTIONAL/files?id=photo'},{id:'bad',file_name:'bad.pdf',mime_type:'application/pdf',signed_url:'javascript:alert(1)'}];
 const html=renderToStaticMarkup(React.createElement(ctx.exports.default,{files,busy:false,onRemove:async()=>{throw Error('No effects')}}));
 const anchors=[...html.matchAll(/<a\b([^>]*)>/g)].map(m=>m[1]);const blank=anchors.filter(a=>/target="_blank"/.test(a));assert.equal(blank.length,1,'PDF open link rendered once');
 for(const attrs of blank){assert.match(attrs,/rel="[^"]*\bnoopener\b/);assert.match(attrs,/rel="[^"]*\bnoreferrer\b/)}
 assert(!html.includes('aria-label="Open bad.pdf"'),'unsafe PDF URL must not produce an open link');assert(!html.includes('target="_blank" aria-label="Open fictional.jpg"'),'image opens in modal, not unsafe new tab');return{newTabLinks:blank.length,unsafeUrlRejected:true};
}
function catalogue(source){
 const ctx={exports:{},URL,Map,require:n=>n==='next/server'?{NextResponse:{json:(body,o={})=>({body,status:o.status||200,headers:o.headers||{}})}}:n.includes('/runtime')?{runtimeTenant:async()=>({id:'fictional-tenant',status:'active',business_name:'Fictional'})}:{centralRest:async path=>{assert(path.includes('tenant_id=eq.fictional-tenant'));return{ok:true,json:async()=>path.startsWith('business_software_tenant_settings?')?[{website:'https://allowed.invalid'}]:[]}}}};
 vm.createContext(ctx);vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,ctx);return ctx.exports.GET;
}
async function checkCors(source){const get=catalogue(source);let cases=0;for(const [origin,expected]of [['https://allowed.invalid','https://allowed.invalid'],['http://allowed.invalid',undefined],['https://allowed.invalid:444',undefined],['https://evil.invalid',undefined],['https://allowed.invalid.evil.invalid',undefined],['null',undefined],['malformed',undefined]]){const r=await get({headers:new Headers({origin})});assert.equal(r.status,200);assert.equal(r.headers['Access-Control-Allow-Origin'],expected,origin);cases++}const r=await get({headers:new Headers()});assert.equal(r.headers['Access-Control-Allow-Origin'],undefined);return cases+1}
(async()=>{const g=checkGallery(gallery);assert.throws(()=>checkGallery(gallery.replace('rel="noopener noreferrer"','rel="noreferrer"')));assert.throws(()=>checkGallery(gallery.replace('rel="noopener noreferrer"','rel="noopener"')));const src=fs.readFileSync(repo+'/'+cataloguePath,'utf8');const count=await checkCors(src);const weakened=src.replace('allowed.protocol==="https:"&&actual.protocol==="https:"&&allowed.origin===actual.origin','allowed.hostname.toLowerCase()===actual.hostname.toLowerCase()');assert.notEqual(weakened,src);await assert.rejects(()=>checkCors(weakened));const result={gallery:g,galleryNegativeMutationsRejected:2,corsCases:count,hostnameOnlyCorsMutationRejected:true,sourceFunctionsActuallyExecuted:true,realNetworkCalls:0,recordWrites:0};console.log(JSON.stringify(result,null,2))})().catch(e=>{console.error(e);process.exitCode=1});
