import {NextResponse} from "next/server";
import dns from "node:dns/promises";
const base=process.env.DS_SUPABASE_URL||process.env.SUPABASE_URL;
const key=process.env.DS_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const reply=(body:any,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const headers=()=>({apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"});
async function admin(req:Request){
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/,"");
 if(!token||!base||!key)return null;
 const r=await fetch(base+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token},cache:"no-store"});
 if(!r.ok)return null;
 const u=await r.json();
 const membership=await fetch(base+"/rest/v1/internal_admins?user_id=eq."+encodeURIComponent(String(u.id))+"&select=user_id&limit=1",{headers:headers(),cache:"no-store"});
 if(!membership.ok)return null;
 return (await membership.json()).length===1?u:null;
}
async function rest(path:string,options:RequestInit={}){return fetch(base+"/rest/v1/"+path,{...options,headers:{...headers(),...options.headers},cache:"no-store"})}
const uuid=(x:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x||"");
async function activationEmail(tenantId:string){
 const review=await rest("business_software_onboarding_reviews?tenant_id=eq."+tenantId+"&approved_at=not.is.null&select=applied_bms_tenant_id,activation_email_sent_at&limit=1");
 if(!review.ok)throw Error("Unable to verify approved setup");
 const approved=(await review.json())[0];
 if(!approved?.applied_bms_tenant_id)throw Error("Setup is not approved");
 if(approved.activation_email_sent_at)return {sent:true,alreadySent:true};
 const [tenant,checkout]=await Promise.all([
 rest("business_software_tenants?id=eq."+encodeURIComponent(approved.applied_bms_tenant_id)+"&status=eq.active&select=canonical_host,business_name&limit=1"),
 rest("checkout_orders?tenant_id=eq."+tenantId+"&service_type=eq.business_software&payment_status=eq.paid&select=customer_email&limit=1")
 ]);
 if(!tenant.ok||!checkout.ok)throw Error("Unable to verify activation recipient");
 const business=(await tenant.json())[0],order=(await checkout.json())[0];
 if(!business||!order?.customer_email)throw Error("Activation recipient or business unavailable");
 const host=String(business.canonical_host||"");
 if(!/^[a-z0-9-]+\\.diamantsolutions\\.co\\.uk$/i.test(host))throw Error("Unverified business domain");
 try{await dns.lookup(host)}catch{throw Error("Tenant domain DNS is not configured. Add the wildcard CNAME before sending activation.")}
 if(!process.env.RESEND_API_KEY)throw Error("Activation email service unavailable");
 const url="https://"+host+"/login";
 const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":"ds-bms-approved-"+tenantId},body:JSON.stringify({from:"Diamant Solutions <info@diamantsolutions.co.uk>",to:[order.customer_email],subject:"Your Business Management Software is ready",html:'<p>Your business setup has been approved.</p><p><a href="'+url+'">Sign in to your Business Management Software</a></p><p>Use the email address associated with your purchase to sign in securely.</p>',text:"Your business setup has been approved. Sign in: "+url+"\\nUse the email address associated with your purchase."}),cache:"no-store"});
 if(!r.ok)throw Error("Activation email delivery failed: "+r.status);
 const saved=await rest("rpc/bms_mark_activation_email",{method:"POST",body:JSON.stringify({p_tenant:tenantId,p_sent:true})});
 if(!saved.ok)throw Error("Activation email sent but delivery record could not be saved");
 return {sent:true};
}
export async function GET(req){
 if(!await admin(req))return reply({error:"Internal administrator access required"},403);
 const r=await rest("onboarding?service_type=eq.business_software&select=tenant_id,status,progress,answers,proposed_config,submitted_at,updated_at,tenants(name,slug)&order=updated_at.desc&limit=200");
 if(!r.ok)return reply({error:"Unable to load onboarding queue"},502);
 const items=await r.json();const reviews=await rest("business_software_onboarding_reviews?select=tenant_id,review_notes,approved_at,applied_bms_tenant_id,activation_email_sent_at,activation_email_error&limit=200");if(!reviews.ok)return reply({error:"Unable to load review records"},502);const byId=new Map((await reviews.json()).map((x:any)=>[x.tenant_id,x]));return reply({items:items.map((x:any)=>({...x,review:byId.get(x.tenant_id)||null}))});
}
export async function PATCH(req){
 const user=await admin(req);if(!user)return reply({error:"Internal administrator access required"},403);
 const body=await req.json().catch(()=>({}));const tenantId=String(body.tenantId||"");
 if(!uuid(tenantId))return reply({error:"Invalid tenant"},400);
 const r=await rest("onboarding?tenant_id=eq."+tenantId+"&service_type=eq.business_software&select=tenant_id,status,answers,proposed_config&limit=1");
 if(!r.ok)return reply({error:"Unable to verify onboarding"},502);
 const row=(await r.json())[0];if(!row)return reply({error:"Onboarding not found"},404);
 if(body.action==="prepare"){
  const order=await rest("checkout_orders?tenant_id=eq."+tenantId+"&service_type=eq.business_software&payment_status=eq.paid&select=stripe_subscription_id,stripe_customer_id&limit=1");
  if(!order.ok)return reply({error:"Unable to verify paid checkout"},503);
  const checkout=(await order.json())[0];
  if(!checkout?.stripe_subscription_id||!checkout?.stripe_customer_id)return reply({error:"Verified paid checkout missing"},409);
  const stripeKey=process.env.STRIPE_SECRET_KEY;
  if(!stripeKey)return reply({error:"Stripe verification unavailable"},503);
  const sr=await fetch("https://api.stripe.com/v1/subscriptions/"+encodeURIComponent(checkout.stripe_subscription_id),{headers:{Authorization:"Bearer "+stripeKey},cache:"no-store"});
  if(!sr.ok)return reply({error:"Could not verify current subscription"},503);
  const sub=await sr.json();
  if(!["active","trialing"].includes(sub.status)||String(sub.customer)!==checkout.stripe_customer_id)return reply({error:"Subscription is not currently active or does not match customer"},409);
  const result=await rest("rpc/bms_prepare_paid_onboarding_tenant",{method:"POST",body:JSON.stringify({p_onboarding_tenant:tenantId,p_reviewer:user.id})});
  if(!result.ok){const detail=await result.json().catch(()=>({}));return reply({error:detail.message||"Tenant preparation failed"},409)}
  return reply({ok:true,bmsTenantId:await result.json()});
 }
 if(body.action==="send_activation"){
  if(row.status!=="ready")return reply({error:"Setup has not been approved"},409);
  try{return reply({ok:true,...await activationEmail(tenantId)})}catch(e:any){await rest("rpc/bms_mark_activation_email",{method:"POST",body:JSON.stringify({p_tenant:tenantId,p_sent:false,p_error:String(e.message||e)})}).catch(()=>{});return reply({error:String(e.message||e)},503)}
 }
 const allowed=["submitted","awaiting_clarification","being_configured"];
 const status=String(body.status||row.status);
 if(!allowed.includes(status)&&status!=="ready")return reply({error:"Invalid review status"},400);
 if(status==="ready"){
  const bmsTenantId=String(body.bmsTenantId||"");
  if(!uuid(bmsTenantId))return reply({error:"Select the verified BMS tenant ID before approving"},400);
  const applied=await rest("rpc/bms_approve_onboarding_configuration",{method:"POST",body:JSON.stringify({p_onboarding_tenant:tenantId,p_bms_tenant:bmsTenantId,p_reviewer:user.id})});
  if(!applied.ok){const detail=await applied.json().catch(()=>({}));return reply({error:detail.message||"Verification or configuration approval failed"},409)}
  const result=await applied.json();
  try{return reply({ok:true,result,activationEmail:await activationEmail(tenantId)})}
  catch(e:any){await rest("rpc/bms_mark_activation_email",{method:"POST",body:JSON.stringify({p_tenant:tenantId,p_sent:false,p_error:String(e.message||e)})}).catch(()=>{});return reply({ok:true,result,activationEmail:{sent:false,error:"Setup approved but activation email needs retry"}})}

 }
 if(!["submitted","awaiting_clarification","being_configured"].includes(row.status))return reply({error:"This onboarding cannot be reviewed yet"},409);
 const update=await rest("onboarding?tenant_id=eq."+tenantId+"&status=eq."+encodeURIComponent(row.status),{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status})});
 if(!update.ok)return reply({error:"Could not update onboarding status"},502);
 const saved=await update.json();if(saved.length!==1)return reply({error:"Concurrent review change; reload"},409);
 const notes=String(body.notes||"").slice(0,10000);
 const review=await rest("business_software_onboarding_reviews?on_conflict=tenant_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({tenant_id:tenantId,reviewer_id:user.id,review_notes:notes,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
 if(!review.ok)return reply({error:"Status saved but review notes failed; retry"},502);
 return reply({ok:true,status});
}
