import {NextResponse} from "next/server";
const base=process.env.DS_SUPABASE_URL||process.env.SUPABASE_URL;
const key=process.env.DS_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const headers=()=>({apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"});
async function admin(req){
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/,"");
 if(!token||!base||!key)return null;
 const r=await fetch(base+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token},cache:"no-store"});
 if(!r.ok)return null;
 const u=await r.json();
 const allowed=String(process.env.DS_INTERNAL_ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 return allowed.includes(String(u.email||"").toLowerCase())?u:null;
}
async function rest(path,options={}){return fetch(base+"/rest/v1/"+path,{...options,headers:{...headers(),...options.headers},cache:"no-store"})}
const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x||"");
export async function GET(req){
 if(!await admin(req))return reply({error:"Internal administrator access required"},403);
 const r=await rest("onboarding?service_type=eq.business_software&select=tenant_id,status,progress,answers,proposed_config,submitted_at,updated_at,tenants(name,slug)&order=updated_at.desc&limit=200");
 if(!r.ok)return reply({error:"Unable to load onboarding queue"},502);
 const items=await r.json();const reviews=await rest("business_software_onboarding_reviews?select=tenant_id,review_notes,approved_at,applied_bms_tenant_id&limit=200");if(!reviews.ok)return reply({error:"Unable to load review records"},502);const byId=new Map((await reviews.json()).map(x=>[x.tenant_id,x]));return reply({items:items.map(x=>({...x,review:byId.get(x.tenant_id)||null}))});
}
export async function PATCH(req){
 const user=await admin(req);if(!user)return reply({error:"Internal administrator access required"},403);
 const body=await req.json().catch(()=>({}));const tenantId=String(body.tenantId||"");
 if(!uuid(tenantId))return reply({error:"Invalid tenant"},400);
 const r=await rest("onboarding?tenant_id=eq."+tenantId+"&service_type=eq.business_software&select=tenant_id,status,answers,proposed_config&limit=1");
 if(!r.ok)return reply({error:"Unable to verify onboarding"},502);
 const row=(await r.json())[0];if(!row)return reply({error:"Onboarding not found"},404);
 const allowed=["submitted","awaiting_clarification","being_configured"];
 const status=String(body.status||row.status);
 if(!allowed.includes(status)&&status!=="ready")return reply({error:"Invalid review status"},400);
 if(status==="ready")return reply({error:"Approval requires verified tenant provisioning and configuration checks; not available through a status change"},409);
 if(!["submitted","awaiting_clarification","being_configured"].includes(row.status))return reply({error:"This onboarding cannot be reviewed yet"},409);
 const update=await rest("onboarding?tenant_id=eq."+tenantId+"&status=eq."+encodeURIComponent(row.status),{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status})});
 if(!update.ok)return reply({error:"Could not update onboarding status"},502);
 const saved=await update.json();if(saved.length!==1)return reply({error:"Concurrent review change; reload"},409);
 const notes=String(body.notes||"").slice(0,10000);
 const review=await rest("business_software_onboarding_reviews?on_conflict=tenant_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({tenant_id:tenantId,reviewer_id:user.id,review_notes:notes,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
 if(!review.ok)return reply({error:"Status saved but review notes failed; retry"},502);
 return reply({ok:true,status});
}
