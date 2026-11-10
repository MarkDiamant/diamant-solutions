import {NextResponse} from "next/server";
import crypto from "node:crypto";

export const runtime="nodejs";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
function verified(body:string,header:string,secret:string){
 const fields=header.split(",").map(x=>x.trim().split("="));
 const timestamp=Number(fields.find(x=>x[0]==="t")?.[1]||0);
 if(!timestamp||Math.abs(Math.floor(Date.now()/1000)-timestamp)>300)return false;
 const expected=crypto.createHmac("sha256",secret).update(String(timestamp)+"."+body).digest();
 return fields.filter(x=>x[0]==="v1").some(x=>{try{const actual=Buffer.from(x[1],"hex");return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected)}catch{return false}});
}
export async function POST(req:Request){
 const secret=process.env.STRIPE_BMS_SEATS_WEBHOOK_SECRET;
 const stripeKey=process.env.STRIPE_SECRET_KEY;
 const priceId=process.env.BMS_TEST_ISOLATED==='true'?process.env.BMS_STRIPE_TEST_MONTHLY_EXTRA_PRICE_ID:process.env.BMS_STRIPE_SEAT_PRICE_ID;const basePriceId=process.env.BMS_TEST_ISOLATED==='true'?process.env.BMS_STRIPE_TEST_MONTHLY_BASE_PRICE_ID:process.env.BMS_STRIPE_BASE_PRICE_ID;
 const supabase=process.env.DS_SUPABASE_URL||process.env.SUPABASE_URL;
 const serviceKey=process.env.DS_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret||!stripeKey||!priceId||!supabase||!serviceKey)return json({error:"Seat billing webhook not configured"},503);
 if(process.env.BMS_TEST_ISOLATED==='true'&&(process.env.BMS_TEST_SUPABASE_PROJECT_REF!=='mhncjudrhevvbmsbvkta'||supabase!=='https://mhncjudrhevvbmsbvkta.supabase.co'||!stripeKey.startsWith('sk_test_')))return json({error:'Isolated seat billing configuration mismatch'},503);
 const raw=await req.text();
 if(!verified(raw,req.headers.get("stripe-signature")||"",secret))return json({error:"Invalid Stripe signature"},400);
 let event:any;try{event=JSON.parse(raw)}catch{return json({error:"Invalid JSON"},400)}
 const type=String(event.type||"");
 if(!["invoice.paid","invoice.payment_failed","customer.subscription.updated","customer.subscription.deleted"].includes(type))return json({received:true,ignored:true});
 const obj=event.data?.object||{};
 const subId=String(type.startsWith("customer.subscription.")?obj.id:obj.subscription||obj.parent?.subscription_details?.subscription||"");
 if(!subId.startsWith("sub_"))return json({received:true,ignored:true});
 const sr=await fetch("https://api.stripe.com/v1/subscriptions/"+encodeURIComponent(subId),{headers:{Authorization:"Bearer "+stripeKey},cache:"no-store"});
 if(!sr.ok)return json({error:"Unable to verify subscription with Stripe"},503);
 const sub:any=await sr.json();
 if(sub.metadata?.product!=="bms_seats")return json({received:true,ignored:true});
 const configured=[{interval:"month",seat:priceId,base:basePriceId},{interval:"year",seat:process.env.BMS_TEST_ISOLATED==='true'?process.env.BMS_STRIPE_TEST_ANNUAL_EXTRA_PRICE_ID:process.env.BMS_STRIPE_ANNUAL_SEAT_PRICE_ID,base:process.env.BMS_TEST_ISOLATED==='true'?process.env.BMS_STRIPE_TEST_ANNUAL_BASE_PRICE_ID:process.env.BMS_STRIPE_ANNUAL_BASE_PRICE_ID}];const items=sub.items?.data||[];const catalogue=configured.find(c=>items.some((item:any)=>item.price?.id===c.base||item.price?.id===c.seat));if(!catalogue)return json({error:"Subscription does not contain a configured BMS licence product"},409);const seatItem=items.find((item:any)=>item.price?.id===catalogue.seat);const baseItem=items.find((item:any)=>item.price?.id===catalogue.base);if(items.some((item:any)=>(item.price?.id===priceId||item.price?.id===basePriceId||item.price?.id===configured[1].seat||item.price?.id===configured[1].base)&&![catalogue.seat,catalogue.base].includes(item.price?.id)))return json({error:"Mixed monthly and annual licence prices are not permitted"},409);
 if(!seatItem&&!baseItem)return json({error:"Subscription does not contain a configured BMS licence product"},409);
 const tenantId=String(sub.metadata?.tenant_id||"");
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId))return json({error:"Missing verified tenant mapping"},409);
 const customerId=typeof sub.customer==="string"?sub.customer:sub.customer?.id;
 if(!customerId)return json({error:"Subscription customer missing"},409);
 const interval=catalogue.interval==="year"?"annual":"monthly";
 const quantity=Number(seatItem?.quantity||0)+Number(baseItem?1:0);
 if(!Number.isSafeInteger(quantity)||quantity<0||quantity>10000)return json({error:"Invalid subscription quantity"},409);
 // A paid event must be verified against the actual paid invoice, not only the
 // current subscription (which may already contain an unpaid seat upgrade).
 if(type==="invoice.paid"){
  const invoiceId=String(obj.id||"");
  if(!invoiceId.startsWith("in_"))return json({error:"Invalid paid invoice"},409);
  const ir=await fetch("https://api.stripe.com/v1/invoices/"+encodeURIComponent(invoiceId),{headers:{Authorization:"Bearer "+stripeKey},cache:"no-store"});
  if(!ir.ok)return json({error:"Unable to verify paid invoice"},503);
  const invoice:any=await ir.json();
  const invoiceSub=typeof invoice.subscription==="string"?invoice.subscription:invoice.parent?.subscription_details?.subscription;
  if(invoice.status!=="paid"||invoice.paid!==true||invoiceSub!==subId)return json({error:"Invoice is not verified as paid for this subscription"},409);
  const lines=await fetch("https://api.stripe.com/v1/invoices/"+encodeURIComponent(invoiceId)+"/lines?limit=100",{headers:{Authorization:"Bearer "+stripeKey},cache:"no-store"});
  if(!lines.ok)return json({error:"Unable to verify invoice line items"},503);
  const invoiceLines:any=await lines.json();
  const licenceLines=(invoiceLines.data||[]).filter((line:any)=>[catalogue.seat,catalogue.base].includes(line.price?.id||line.pricing?.price_details?.price));
  if(invoiceLines.has_more)return json({error:"Invoice has additional unverified lines"},503);
  if(!licenceLines.length)return json({received:true,ignored:true});
  const invoicedSeats=licenceLines.reduce((n:number,line:any)=>n+(line.price?.id===catalogue.base||line.pricing?.price_details?.price===catalogue.base?1:Number(line.quantity||0)),0);
  if(!Number.isSafeInteger(invoicedSeats)||invoicedSeats<quantity)return json({received:true,ignored:true,reason:"Current subscription has seats not yet covered by this invoice"});
 }

 const rpc=await fetch(supabase.replace(/\/$/,"")+"/rest/v1/rpc/bms_apply_verified_seat_billing_event",{
  method:"POST",headers:{apikey:serviceKey,Authorization:"Bearer "+serviceKey,"Content-Type":"application/json"},
  body:JSON.stringify({p_event_id:String(event.id),p_tenant:tenantId,p_subscription:subId,p_customer:customerId,p_type:type,p_status:String(sub.status||"unknown"),p_seats:quantity,p_interval:interval,p_period_end:sub.current_period_end?new Date(Number(sub.current_period_end)*1000).toISOString():null,p_created:new Date(Number(event.created)*1000).toISOString()}),cache:"no-store"
 });
 if(!rpc.ok){const detail=await rpc.json().catch(()=>({}));return json({error:"Unable to synchronise verified billing",detail:detail.message||undefined},503)}
 return json({received:true});
}
