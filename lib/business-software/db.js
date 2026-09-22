const SB=process.env.NEXT_PUBLIC_SUPABASE_URL;
const SK=process.env.SUPABASE_SERVICE_ROLE_KEY;
const PK=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function headers(key,extra={}){return {apikey:key||"",Authorization:`Bearer ${key||""}`,"Content-Type":"application/json",...extra}}

export function centralConfigured(){return Boolean(SB&&(SK||PK))}

export async function centralRest(path,init={}){
  if(!SB||!SK)throw new Error("Central Business Software privileged database access is not configured");
  return fetch(`${SB}/rest/v1/${path}`,{...init,headers:headers(SK,init.headers||{}),cache:"no-store"});
}

export async function tenantRecord(slug,host=null){
  if(!SB||!(SK||PK))return null;
  const key=SK||PK;
  const r=await fetch(`${SB}/rest/v1/rpc/business_software_public_tenant`,{method:"POST",headers:headers(key),body:JSON.stringify({p_slug:slug||null,p_host:host||null}),cache:"no-store"});
  if(!r.ok)return null;
  return (await r.json())?.[0]||null;
}

export async function publicTenantSettings(slug){
  if(!SB||!(SK||PK))return null;
  const key=SK||PK;
  const r=await fetch(`${SB}/rest/v1/rpc/business_software_public_settings`,{method:"POST",headers:headers(key),body:JSON.stringify({p_slug:slug}),cache:"no-store"});
  if(!r.ok)return null;
  return (await r.json())?.[0]||null;
}
