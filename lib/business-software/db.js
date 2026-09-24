const SB=process.env.DS_SUPABASE_URL;
const SK=process.env.DS_SUPABASE_SERVICE_ROLE_KEY;
const PK=process.env.DS_SUPABASE_PUBLISHABLE_KEY;

function headers(key,extra={}){const auth=key&&!String(key).startsWith("sb_publishable_")?{Authorization:`Bearer ${key}`}:{ };return {apikey:key||"",...auth,"Content-Type":"application/json",...extra}}

export function centralConfigured(){return Boolean(SB&&(SK||PK))}

export async function centralRest(path,init={}){
  if(!SB||!SK)throw new Error("Central Business Software privileged database access is not configured");
  return fetch(`${SB}/rest/v1/${path}`,{...init,headers:headers(SK,init.headers||{}),cache:"no-store"});
}

export async function tenantRecord(slug,host=null){
  if(!SB||!(SK||PK))return null;
  const key=SK||PK;
  const r=await fetch(`${SB}/rest/v1/rpc/business_software_public_tenant`,{method:"POST",headers:headers(key),body:JSON.stringify({p_slug:slug||null,p_host:host||null}),cache:"no-store"});
  if(r.ok){const row=(await r.json())?.[0];if(row)return row;}
  // Privileged fallback is intentional for server-side central services while the public tenant RPC is being migrated.
  if(SK){const clauses=slug?`slug=eq.${encodeURIComponent(slug)}`:host?`canonical_host=eq.${encodeURIComponent(host)}`:"";if(clauses){const direct=await centralRest(`business_software_tenants?${clauses}&select=id,slug,business_name,canonical_host,status,billing_mode,reference_tenant&limit=1`);if(direct.ok)return (await direct.json())?.[0]||null;}}
  return null;
}

export async function publicTenantSettings(slug){
  if(!SB||!(SK||PK))return null;
  const key=SK||PK;
  const r=await fetch(`${SB}/rest/v1/rpc/business_software_public_settings`,{method:"POST",headers:headers(key),body:JSON.stringify({p_slug:slug}),cache:"no-store"});
  if(!r.ok)return null;
  return (await r.json())?.[0]||null;
}

export async function centralAuth(path,init={}){
 if(!SB||!SK)throw new Error("Central Business Software privileged auth access is not configured");
 return fetch(`${SB}/auth/v1/${path}`,{...init,headers:{apikey:SK,Authorization:`Bearer ${SK}`,"Content-Type":"application/json",...(init.headers||{})},cache:"no-store"});
}

export async function centralStorage(path,init={}){
 if(!SB||!SK)throw new Error("Central Business Software privileged storage access is not configured");
 return fetch(`${SB}/storage/v1/${path}`,{...init,headers:{apikey:SK,Authorization:`Bearer ${SK}`,...(init.headers||{})},cache:"no-store"});
}
