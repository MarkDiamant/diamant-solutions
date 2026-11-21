// Source-only ordinary email recovery initiation. No client-chosen redirect.
const AUTH = 'https://iepqggrfenfqrqyzqyed.supabase.co/auth/v1';
const PUBLIC_KEY = 'sb_publishable_ivTCLFGFroexc-3IHe25bg_qhzg_GIy';
export async function requestRecoveryLink(request, {tenantRecord, centralRest, enabledHosts = '', fetcher = fetch, provider = {auth:AUTH,publicKey:PUBLIC_KEY}}) {
 const generic = {status:202,body:{ok:true,message:'If this email belongs to an active account for this business, a recovery email can be sent. Check your inbox. If it does not arrive, try later or contact support.'}};
 const fail = (status,error) => ({status,body:{error}});
 try {
  const url = new URL(request.url);
  if(url.protocol !== 'https:' || request.headers.get('origin') !== url.origin) return fail(403,'Open this page on your business sign-in website.');
  // An explicit deployment gate remains empty until the exact callback is reviewed
  // and allowlisted. No wildcard, preview host, caller redirect or forwarded host.
  const allowed = enabledHosts.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!allowed.includes(url.hostname.toLowerCase()) || url.port) return fail(503,'Recovery email requests are not available on this website yet.');
  if(Number(request.headers.get('content-length') || 0)>2048) return fail(400,'Enter your account email address.');
  const raw = await request.text();
  if(raw.length>2048) return fail(400,'Enter your account email address.');
  let data;try{data=JSON.parse(raw);}catch{return fail(400,'Enter your account email address.');}
  const email=typeof data?.email==='string'?data.email.trim().toLowerCase():'';
  if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400,'Enter your account email address.');
  const host=url.hostname.toLowerCase();
  const tenant=await tenantRecord(null,host);
  if(!tenant?.id || tenant.status!=='active' || tenant.canonical_host!==host) return generic;
  const reserved=await centralRest('rpc/bms_reserve_recovery_email',{method:'POST',body:JSON.stringify({p_tenant:tenant.id,p_host:host,p_email:email})});
  const eligible=reserved.ok?await reserved.json().catch(()=>null):null;
  // Missing migration, unavailable limiter, ambiguous or foreign membership,
  // throttling and malformed RPC response all fail closed, with identical copy.
  if(eligible!==true) return generic;
  await fetcher(provider.auth+'/recover?redirect_to='+encodeURIComponent('https://'+host+'/bms-recover-password'),{method:'POST',headers:{apikey:provider.publicKey,'Content-Type':'application/json'},body:JSON.stringify({email}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  return generic;
 } catch { return generic; }
}
