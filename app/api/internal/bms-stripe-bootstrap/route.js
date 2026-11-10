import {NextResponse} from 'next/server';
import crypto from 'node:crypto';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const host='https://bms-acceptance.diamantsolutions.co.uk';
const endpoints=[
 {url:host+'/api/stripe/webhook',events:['checkout.session.completed','checkout.session.async_payment_succeeded','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed'],env:'STRIPE_WEBHOOK_SECRET'},
 {url:host+'/api/stripe/bms-seats-webhook',events:['customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed'],env:'STRIPE_BMS_SEATS_WEBHOOK_SECRET'}
];
function same(a,b){return Array.isArray(a)&&a.length===b.length&&a.every(x=>b.includes(x))}
export async function POST(req){
 const token=process.env.BMS_WEBHOOK_BOOTSTRAP_TOKEN||'';
 const supplied=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
 if(!token||supplied.length!==token.length||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(token)))return NextResponse.json({error:'Unauthorized'},{status:401});
 if(process.env.VERCEL_ENV!=='preview'||process.env.BMS_TEST_ISOLATED!=='true'||process.env.BMS_TEST_PREVIEW_URL!==host||process.env.BMS_TEST_SUPABASE_PROJECT_REF!=='mhncjudrhevvbmsbvkta'||!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))return NextResponse.json({error:'Isolated Preview only'},{status:503});
 const key=process.env.STRIPE_SECRET_KEY;
 async function stripe(path,params){
  const r=await fetch('https://api.stripe.com/v1/'+path,{method:params?'POST':'GET',headers:{Authorization:'Bearer '+key,...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(params?{body:new URLSearchParams(params)}:{})});
  const j=await r.json();if(!r.ok)throw new Error('Stripe API HTTP '+r.status);return j;
 }
 try{
  const existing=await stripe('webhook_endpoints?limit=100');
  if(existing.has_more)throw new Error('Webhook catalogue too large to verify duplicates');
  const output={};
  for(const endpoint of endpoints){
   const matches=existing.data.filter(x=>x.url===endpoint.url&&x.status==='enabled');
   if(matches.length>1)throw new Error('Duplicate enabled webhook for '+endpoint.env);
   if(matches.length){if(!same(matches[0].enabled_events,endpoint.events))throw new Error('Existing webhook events mismatch for '+endpoint.env);output[endpoint.env]={status:'existing',id:matches[0].id};continue}
   const body={url:endpoint.url,description:'BMS isolated acceptance test webhook',...Object.fromEntries(endpoint.events.map((e,i)=>['enabled_events['+i+']',e]))};
   const created=await stripe('webhook_endpoints',body);
   if(created.livemode!==false||!created.secret?.startsWith('whsec_'))throw new Error('Test webhook creation verification failed');
   output[endpoint.env]={status:'created',id:created.id,secret:created.secret};
  }
  return NextResponse.json({result:output},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e.message},{status:503,headers:{'Cache-Control':'no-store'}})}
}
