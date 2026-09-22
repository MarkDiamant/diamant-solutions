const SB=process.env.NEXT_PUBLIC_SUPABASE_URL;
const SK=process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(extra={}){return {apikey:SK||"",Authorization:`Bearer ${SK||""}`,"Content-Type":"application/json",...extra}}

export function centralConfigured(){return Boolean(SB&&SK)}

export async function centralRest(path,init={}){
  if(!centralConfigured())throw new Error("Central Business Software database is not configured");
  return fetch(`${SB}/rest/v1/${path}`,{...init,headers:headers(init.headers||{}),cache:"no-store"});
}

export async function tenantRecord(slug){
  const r=await centralRest(`business_software_tenants?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`);
  if(!r.ok)return null;
  return (await r.json())?.[0]||null;
}
