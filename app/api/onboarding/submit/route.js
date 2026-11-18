import onboardingModel from '../../../../lib/bms-onboarding-model.cjs';
import proposedConfigBuilder from '../../../../lib/bms-onboarding-proposed-config.cjs';
import {NextResponse} from 'next/server';
const SB=process.env.DS_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://iepqggrfenfqrqyzqyed.supabase.co';
const SK=process.env.DS_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const getHeaders=()=>({apikey:SK,Authorization:'Bearer '+SK,'Content-Type':'application/json'});
export async function POST(request){
 try{
  if(!SB||!SK)return NextResponse.json({error:'Submission service unavailable'},{status:503});
  const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');
  if(!token)return NextResponse.json({error:'Sign in required'},{status:401});
  const auth=await fetch(SB+'/auth/v1/user',{headers:{apikey:SK,Authorization:'Bearer '+token},cache:'no-store'});
  if(!auth.ok)return NextResponse.json({error:'Your session expired. Sign in again.'},{status:401});
  const user=await auth.json();
  const body=await request.json();
  const {tenantId,service,answers,logoPath}=body;
  if(!/^[0-9a-f-]{36}$/i.test(tenantId||'')||!['website','business_software'].includes(service)||!answers||typeof answers!=='object'||Array.isArray(answers))return NextResponse.json({error:'Invalid submission'},{status:400});
  const member=await fetch(SB+'/rest/v1/tenant_members?user_id=eq.'+encodeURIComponent(user.id)+'&tenant_id=eq.'+encodeURIComponent(tenantId)+'&select=tenant_id',{headers:getHeaders(),cache:'no-store'});
  if(!member.ok){console.error('Membership lookup failed',member.status,await member.text());return NextResponse.json({error:'We could not complete your submission right now. Your answers are safe; please try again shortly.'},{status:502})}
  const members=await member.json();
  if(!members.length)return NextResponse.json({error:'We could not confirm access to this setup. Please contact support.'},{status:403});
  if(String(user.email||'').trim().toLowerCase()!==String(answers.email||'').trim().toLowerCase())return NextResponse.json({error:'Your contact email must match the verified account used to purchase this setup'},{status:403});
  const paid=await fetch(SB+'/rest/v1/checkout_orders?tenant_id=eq.'+encodeURIComponent(tenantId)+'&service_type=eq.'+encodeURIComponent(service)+'&payment_status=eq.paid&customer_email=ilike.'+encodeURIComponent(String(user.email||''))+'&select=id&limit=1',{headers:getHeaders(),cache:'no-store'});
  if(!paid.ok)return NextResponse.json({error:'Unable to verify payment for this setup'},{status:503});
  if(!(await paid.json()).length)return NextResponse.json({error:'Verified paid checkout required before submitting'},{status:403});
  const current=await fetch(SB+'/rest/v1/onboarding?tenant_id=eq.'+tenantId+'&select=status,service_type,plan_selection&limit=1',{headers:getHeaders(),cache:'no-store'});
  if(!current.ok)return NextResponse.json({error:'Could not load setup'},{status:502});
  const existing=(await current.json())[0];
  if(!existing||existing.service_type!==service)return NextResponse.json({error:'Setup not found'},{status:404});
  if(existing.status==='submitted')return NextResponse.json({ok:true,alreadySubmitted:true});
  if(!['in_progress','awaiting_clarification'].includes(existing.status))return NextResponse.json({error:'Setup cannot be submitted in its current state'},{status:409});
  const required=service==='website'?['businessName','contactName','email','businessType','domainOwnership']:['businessName','contactName','email','phone','businessType','workflow','features','users'];
  if(required.some(k=>!String(answers[k]||'').trim()))return NextResponse.json({error:'Please complete the required questions'},{status:400});
  const questionnaire=service==='business_software'?onboardingModel.completion(answers):null;
  if(questionnaire?.missing.length)return NextResponse.json({error:'Complete the questionnaire or explicitly mark questions not applicable or for discussion.',missing:questionnaire.missing},{status:400});
  const proposedConfig=service==='business_software'?proposedConfigBuilder.buildProposedConfig({answers,planSelection:existing.plan_selection,logoPath}):null;
  const payload={answers,service_type:service,current_step:questionnaire?questionnaire.finalStep:4,progress:100,status:'submitted',submitted_at:new Date().toISOString(),logo_path:logoPath||null,...(proposedConfig?{proposed_config:proposedConfig}:{})};
  // Subscription selection is server-owned. Questionnaire requests never alter paid seats.
  if(service==='business_software')payload.plan_selection=existing.plan_selection||{};
  const saved=await fetch(SB+'/rest/v1/onboarding?tenant_id=eq.'+tenantId+'&status=eq.'+encodeURIComponent(existing.status),{method:'PATCH',headers:{...getHeaders(),Prefer:'return=representation'},body:JSON.stringify(payload),cache:'no-store'});
  if(!saved.ok){console.error('Onboarding submission rejected',saved.status,await saved.text());return NextResponse.json({error:'Database rejected submission. Please contact support.'},{status:502})}
  const rows=await saved.json();
  if(rows.length===1&&proposedConfig&&JSON.stringify(rows[0].proposed_config)!==JSON.stringify(proposedConfig)){
   // JSONB key order is not significant. Compare stable projections.
   const canonical=x=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
   if(canonical(rows[0].proposed_config)!==canonical(proposedConfig))return NextResponse.json({error:'Your answers were saved, but configuration verification failed. Contact support; do not resubmit.'},{status:502});
  }
  if(rows.length!==1)return NextResponse.json({error:'Submission could not be confirmed'},{status:409});
  return NextResponse.json({ok:true});
 }catch(e){console.error('Onboarding submission error',e);return NextResponse.json({error:'Submission failed unexpectedly'},{status:500})}
}
