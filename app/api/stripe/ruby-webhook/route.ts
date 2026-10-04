import {NextResponse} from "next/server";
import crypto from "node:crypto";

export const runtime="nodejs";
function verify(payload:string,header:string,secret:string){
 const parts=header.split(",").map(x=>x.split("="));const t=parts.find(x=>x[0]==="t")?.[1],sigs=parts.filter(x=>x[0]==="v1").map(x=>x[1]);
 if(!t||!sigs.length)return false;const expected=crypto.createHmac("sha256",secret).update(t+"."+payload).digest("hex");
 return sigs.some(sig=>{try{return crypto.timingSafeEqual(Buffer.from(sig,"hex"),Buffer.from(expected,"hex"))}catch{return false}});
}
export async function POST(req:Request){
 const secret=process.env.STRIPE_RUBY_WEBHOOK_SECRET,url=process.env.SUPABASE_URL,key=process.env.DS_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret||!url||!key)return NextResponse.json({error:"Webhook not configured"},{status:503});
 const raw=await req.text(),sig=req.headers.get("stripe-signature")||"";if(!verify(raw,sig,secret))return NextResponse.json({error:"Invalid signature"},{status:400});
 const event=JSON.parse(raw),obj=event?.data?.object||{};
 if(String(event.type||"").startsWith("customer.subscription.")){
  const tenantId=String(obj?.metadata?.tenant_id||"");if(tenantId){
   const active=["active","trialing"].includes(String(obj.status||""));const item=obj?.items?.data?.[0],interval=item?.price?.recurring?.interval||null;
   const body={tenant_id:tenantId,plan_code:"bms",billing_status:String(obj.status||"unknown"),billing_interval:interval,ai_enabled:active,stripe_customer_id:typeof obj.customer==="string"?obj.customer:null,stripe_subscription_id:String(obj.id||""),current_period_end:obj.current_period_end?new Date(Number(obj.current_period_end)*1000).toISOString():null,updated_at:new Date().toISOString()};
   const r=await fetch(url+"/rest/v1/business_software_subscriptions?tenant_id=eq."+encodeURIComponent(tenantId),{method:"PATCH",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(body)});
   const rows=await r.json().catch(()=>[]);if(!r.ok)return NextResponse.json({error:"Entitlement update failed"},{status:500});
   if(!Array.isArray(rows)||!rows.length){const ins=await fetch(url+"/rest/v1/business_software_subscriptions",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify(body)});if(!ins.ok)return NextResponse.json({error:"Entitlement insert failed"},{status:500});}
  }
 }
 return NextResponse.json({received:true});
}