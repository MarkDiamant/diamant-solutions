import crypto from "crypto";
import { NextResponse } from "next/server";
import { centralRest } from "../../../../lib/business-software/db";

async function authenticatedUser(request){const auth=request.headers.get("authorization")||"";if(!auth.startsWith("Bearer "))return null;const base=process.env.DS_SUPABASE_URL||"https://iepqggrfenfqrqyzqyed.supabase.co",key=process.env.DS_SUPABASE_SERVICE_ROLE_KEY;if(!key)return null;const r=await fetch(base+"/auth/v1/user",{headers:{apikey:key,Authorization:auth},cache:"no-store"});return r.ok?r.json():null;}
function slugify(value){return String(value||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)}
async function orderBySession(sessionId){
 const r=await centralRest("checkout_orders?stripe_checkout_session_id=eq."+encodeURIComponent(sessionId)+"&service_type=eq.business_software&payment_status=eq.paid&select=*&limit=1");
 if(!r.ok)return null;return (await r.json())?.[0]||null;
}
async function verifiedStripeSession(sessionId){
 const key=process.env.STRIPE_SECRET_KEY;if(!key)return null;
 const r=await fetch("https://api.stripe.com/v1/checkout/sessions/"+encodeURIComponent(sessionId),{headers:{Authorization:"Bearer "+key},cache:"no-store"});if(!r.ok)return null;const s=await r.json();const paid=s.payment_status==="paid"||(s.mode==="subscription"&&s.status==="complete"&&s.payment_status==="no_payment_required");return paid&&s.metadata?.service_type==="business_software"?s:null;
}
async function uniqueSlug(base){
 const root=base||"business";
 for(let n=0;n<20;n++){const candidate=n?root+"-"+(n+1):root;const r=await centralRest("business_software_tenants?slug=eq."+encodeURIComponent(candidate)+"&select=id&limit=1");if(r.ok&&(await r.json()).length===0)return candidate}
 return root+"-"+crypto.randomBytes(3).toString("hex");
}
export async function POST(request){
 try{
  const user=await authenticatedUser(request);if(!user?.email)return NextResponse.json({error:"Secure sign-in required"},{status:401});
  const body=await request.json(),sessionId=String(body.sessionId||"").trim(),businessName=String(body.businessName||"").trim();
  if(!sessionId||!businessName)return NextResponse.json({error:"Checkout session and business name are required"},{status:400});
  if(!process.env.DS_SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:"Business Software provisioning is not configured"},{status:503});
  const [order,stripeSession]=await Promise.all([orderBySession(sessionId),verifiedStripeSession(sessionId)]);
  if(!order||!stripeSession)return NextResponse.json({error:"Verified paid Business Software order not found"},{status:404});
  if(String(order.customer_email||"").toLowerCase()!==String(user.email).toLowerCase())return NextResponse.json({error:"This purchase belongs to a different signed-in account"},{status:403});
  if(order.stripe_customer_id&&stripeSession.customer&&order.stripe_customer_id!==stripeSession.customer)return NextResponse.json({error:"Checkout verification failed"},{status:409});
  if(order.tenant_id){
   const existing=await centralRest("business_software_tenants?id=eq."+order.tenant_id+"&select=slug,canonical_host&limit=1");const row=(await existing.json())?.[0];
   return NextResponse.json({ok:true,tenant:row,alreadyProvisioned:true});
  }
  const slug=await uniqueSlug(slugify(body.slug||businessName)),canonicalHost=slug+".diamantsolutions.co.uk";
  const tenantRes=await centralRest("business_software_tenants",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({slug,business_name:businessName,canonical_host:canonicalHost,status:"active",billing_mode:"paid",reference_tenant:false,data_backend:"central"})});
  if(!tenantRes.ok)return NextResponse.json({error:"Unable to create tenant"},{status:500});
  const tenant=(await tenantRes.json())[0];
  const created=await Promise.all([
   centralRest("business_software_tenant_settings",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({tenant_id:tenant.id,business_name:businessName,email:order.customer_email||null,timezone:"Europe/London",currency:"GBP",quote_prefix:String(body.quotePrefix||"Q").slice(0,8),invoice_prefix:String(body.invoicePrefix||"INV").slice(0,8),features:{quotes:true,invoices:true,gmail:true}})}),
   centralRest("business_software_subscriptions",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({tenant_id:tenant.id,plan_code:order.plan_key||"business-software",billing_status:"active",billing_interval:order.billing_interval||"monthly",included_users:2,extra_users:Math.max(0,Number(order.users||2)-2),ai_enabled:Boolean(order.ai_included),stripe_customer_id:order.stripe_customer_id||null,stripe_subscription_id:order.stripe_subscription_id||null})}),
   order.customer_email?centralRest("business_software_users",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({tenant_id:tenant.id,email:order.customer_email,display_name:String(body.adminName||"").trim()||null,role:"owner",status:"invited"})}):Promise.resolve(null)
  ]);
  if(created.some(r=>r&&r.ok===false))return NextResponse.json({error:"Tenant created but setup could not be completed. Support has been notified."},{status:500});
  await centralRest("business_software_audit_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({tenant_id:tenant.id,actor:order.customer_email||"checkout",action:"provisioned",entity_type:"tenant",entity_id:tenant.id,metadata:{slug,checkout_session_id:sessionId}})});
  await centralRest("checkout_orders?id=eq."+order.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({tenant_id:tenant.id,provisioning_status:"active",provisioning_slug:slug})});
  return NextResponse.json({ok:true,tenant:{slug,canonicalHost}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to provision Business Software"},{status:500})}
}
