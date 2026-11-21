// Isolated test-build adapter only. Not imported by production application routes.
// Caller must supply the isolated credentials explicitly, never production fallback.
const DENIED_PROJECTS=new Set(['iepqggrfenfqrqyzqyed','tenbhjqkaidkuadyfmeg']);
export function isolatedRecoveryAdapter(config,network){
 if(typeof network!=='function')throw Error('Explicit isolated transport required');
 const {projectUrl,expectedProjectRef,publishableKey,serviceKey,appOrigin,approvedRecipient}=config||{};
 if(!/^[a-z]{20}$/.test(expectedProjectRef||'')||DENIED_PROJECTS.has(expectedProjectRef))throw Error('Dedicated isolated project required');
 const expected='https://'+expectedProjectRef+'.supabase.co';
 if(projectUrl!==expected)throw Error('Exact isolated provider URL required');
 const app=new URL(appOrigin);
 if(app.protocol!=='https:'||app.origin!==appOrigin||app.port||app.hostname.endsWith('.diamantsolutions.co.uk')||app.hostname==='diamantsolutions.co.uk'||app.hostname.endsWith('.mjmetal.co.uk')||app.hostname==='mjmetal.co.uk')throw Error('Dedicated HTTPS isolated app origin required');
 if(typeof publishableKey!=='string'||!publishableKey.startsWith('sb_publishable_')||typeof serviceKey!=='string'||serviceKey.length<20||serviceKey===publishableKey)throw Error('Explicit isolated credentials required');
 if(typeof approvedRecipient!=='string'||!approvedRecipient||approvedRecipient!==approvedRecipient.trim().toLowerCase()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(approvedRecipient))throw Error('Explicit approved isolated recipient required');
 async function guardedFetch(input,init={}){
  const url=new URL(String(input));
  const method=String(init.method||'GET').toUpperCase();
  const allowed=new Set(['GET /auth/v1/user','PUT /auth/v1/user','POST /auth/v1/recover','POST /rest/v1/rpc/bms_recovery_membership','POST /rest/v1/rpc/business_software_public_tenant','POST /rest/v1/rpc/bms_reserve_recovery_email']);
  if(!allowed.has(method+' '+url.pathname))throw Error('Isolated method/path denied');
  if(url.hash||url.origin!==expected||url.username||url.password||url.port||!['/auth/v1/user','/auth/v1/recover','/rest/v1/rpc/bms_recovery_membership','/rest/v1/rpc/business_software_public_tenant','/rest/v1/rpc/bms_reserve_recovery_email'].includes(url.pathname))throw Error('Isolated network target denied');
  if(url.pathname!=='/auth/v1/recover'&&url.search)throw Error('Isolated query denied');
  if(url.pathname==='/auth/v1/recover'){
   if([...url.searchParams.keys()].join(',')!=='redirect_to')throw Error('Exact isolated callback query required');
   const data=JSON.parse(init.body||'{}');
   if(data.email!==approvedRecipient||url.searchParams.get('redirect_to')!==appOrigin+'/bms-recover-password')throw Error('Isolated mail recipient/callback denied');
  }
  return network(url.toString(),{...init,redirect:'error',cache:'no-store'});
 }
 const privilegedHeaders={apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'};
 return {
  appOrigin,provider:{auth:expected+'/auth/v1',rest:expected+'/rest/v1',publicKey:publishableKey},fetcher:guardedFetch,enabledHosts:app.hostname,
  async tenantRecord(slug,host){
   if(slug!==null||host!==app.hostname)return null;
   const response=await guardedFetch(expected+'/rest/v1/rpc/business_software_public_tenant',{method:'POST',headers:{apikey:publishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_slug:null,p_host:host})});
   if(!response.ok)throw Error('Isolated tenant lookup unavailable');
   const rows=await response.json();if(!Array.isArray(rows)||rows.length!==1)return null;return rows[0];
  },
  async centralRest(path,init){
   if(path!=='rpc/bms_reserve_recovery_email')throw Error('Isolated privileged route denied');
   return guardedFetch(expected+'/rest/v1/'+path,{...init,headers:privilegedHeaders});
  }
 };
}
