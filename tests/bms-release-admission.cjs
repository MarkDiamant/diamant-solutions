// Request admission, not a server-billing or response-transfer cutoff.
const fs=require('node:fs');
class Admission {
 constructor({origins,maxDynamic=128,maxTotal=320,budgetPath}){this.origins=new Set(origins);this.maxDynamic=maxDynamic;this.maxTotal=maxTotal;this.budgetPath=budgetPath;this.dynamic=0;this.total=0;this.denied=[];this.blocked=[];this.requests=[]}
 admit({url,method='GET',headers={}}){const u=new URL(url);if(u.username||u.password||[...new Set(u.searchParams.keys())].some(k=>u.searchParams.getAll(k).length!==1)){this.denied.push({path:u.pathname,reason:'ambiguous-url'});return {allow:false,reason:'ambiguous-url'}}const optionalOrigins=new Set(['https://static.wixstatic.com','https://res.cloudinary.com','https://www.woulduseagain.com','https://diamantsolutions.co.uk','https://woulduseagain.com','https://www.samcerts.co.uk']);if(!this.origins.has(u.origin)&&optionalOrigins.has(u.origin)&&(/\.(?:png|svg|webp)$/.test(u.pathname)||u.pathname==='/website-widget/diamant-solutions-35c0c36f')){this.blocked.push({path:u.pathname,reason:'known-optional-third-party'});return {allow:false,reason:'known-optional-third-party'}}if(!this.origins.has(u.origin)||!['GET','HEAD'].includes(method)){this.denied.push({origin:u.origin,path:u.pathname,reason:'destination-or-method'});return {allow:false,reason:'destination-or-method'}};if(headers['next-router-prefetch']==='1'||headers.purpose==='prefetch'||headers['sec-purpose']==='prefetch')return {allow:false,reason:'speculative-prefetch'};
 if(u.searchParams.has('_rsc')&&!['/bms-runtime','/bms-runtime/stock','/bms-runtime/jobs/DS0284'].includes(u.pathname)){this.blocked.push({path:u.pathname,reason:'unneeded-RSC-prefetch'});return {allow:false,reason:'unneeded-RSC-prefetch'}}
 const expectedBlock=['/api/business-software/icon','/api/business-software/manifest','/api/business-software/tenant-logo','/api/business-software/tasks','/api/bms-live/payments/customer-ledger-summary','/api/bms-stock','/website-widget/diamant-solutions-35c0c36f'];
 if(expectedBlock.includes(u.pathname)||/\.(?:png|svg|ico|webp)$/.test(u.pathname)){this.blocked.push({path:u.pathname,reason:'optional-out-of-scope'});return {allow:false,reason:'optional-out-of-scope'}}
 const staticAsset=u.pathname.startsWith('/_next/static/')&&/\.(?:js|css|woff2?)$/.test(u.pathname)&&u.search==='';
 const samples=new Set(['northstar','flooring','electrical']);
 const fixturePaths=new Set(['session','settings','jobs','dashboard','job-types','integrations/xero/unmatched','stock','worker/labour-summary']);
 let dynamicAllowed=false;
 if(['/software','/bms-demo','/northstar','/northstar/jobs/DS0284'].includes(u.pathname))dynamicAllowed=u.search==='';
 if(['/bms-runtime','/bms-runtime/stock','/bms-runtime/jobs/DS0284'].includes(u.pathname))dynamicAllowed=samples.has(u.searchParams.get('sample'))&&[...u.searchParams.keys()].every(k=>['sample','_rsc','tab'].includes(k))&&(!u.searchParams.has('tab')||u.searchParams.get('tab')==='Workforce');
 if(u.pathname.startsWith('/api/bms-demo/')){const path=u.pathname.slice('/api/bms-demo/'.length);dynamicAllowed=fixturePaths.has(path)&&samples.has(u.searchParams.get('sample'))&&[...u.searchParams.keys()].every(k=>(path==='worker/labour-summary'?['sample','job_id','reference']:['sample']).includes(k));if(path==='worker/labour-summary')dynamicAllowed=dynamicAllowed&&u.searchParams.get('sample')==='northstar'&&u.searchParams.get('reference')==='DS0284'&&u.searchParams.get('job_id')==='northstar-job-1';}
 if(!staticAsset&&!dynamicAllowed){this.denied.push({path:u.pathname,reason:'unexpected-route-or-query'});return {allow:false,reason:'route'}};
 if(this.total>=this.maxTotal||(!staticAsset&&this.dynamic>=this.maxDynamic)){this.denied.push({path:u.pathname,reason:'budget'});return {allow:false,reason:'budget'}};
 this.total++;if(!staticAsset)this.dynamic++;this.requests.push({path:u.pathname,query:u.search,staticAsset});return {allow:true,staticAsset};
 }
 report(){const r={total:this.total,dynamic:this.dynamic,denied:this.denied,blocked:this.blocked,requests:this.requests,server_transfer_limit:false};if(this.budgetPath)fs.writeFileSync(this.budgetPath,JSON.stringify(r,null,2));return r}
}
module.exports={Admission};
