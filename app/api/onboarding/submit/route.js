import {NextResponse} from 'next/server';
const SB=process.env.DS_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
const SK=process.env.DS_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers={apikey:SK,Authorization:'Bearer '+SK,'Content-Type':'application/json'};
export async function POST(request){
 try{
  if(!SB||!SK)return NextResponse.json({error:'Submission service unavailable'},{status:503});
  const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');
  if(!token)return NextResponse.json({error:'Sign in required'},{status:401});
  const auth=await fetch(SB+'/auth/v1/user',{headers:{apikey:SK,Authorization:'Bearer '+token},cache:'no-store'});
  if(!auth.ok)return NextResponse.json({error:'Your session expired. Sign in again.'},{status:401});
  const user=await auth.json();
  const body=await request.json();
  const {tenantId,service,answers,logoPath,selection}=body;
  if(!/^[0-9a-f-]{36}$/i.test(tenantId||'')||!['website','business_software'].includes(service)||!answers||typeof answers!=='object'||Array.isArray(answers))return NextResponse.json({error:'Invalid submission'},{status:400});
  const member=await fetch(SB+'/rest/v1/tenant_members?user_id=eq.'+encodeURIComponent(user.id)+'&tenant_id=eq.'+encodeURIComponent(tenantId)+'&select=tenant_id,tenants!inner(service_type)&tenants.service_type=eq.'+service,{headers,cache:'no-store'});
  const members=member.ok?await member.json():[];
  if(!members.length)return NextResponse.json({error:'This setup is not linked to your account'},{status:403});
  const current=await fetch(SB+'/rest/v1/onboarding?tenant_id=eq.'+tenantId+'&select=status,service_type&limit=1',{headers,cache:'no-store'});
  if(!current.ok)return NextResponse.json({error:'Could not load setup'},{status:502});
  const existing=(await current.json())[0];
  if(!existing||existing.service_type!==service)return NextResponse.json({error:'Setup not found'},{status:404});
  if(existing.status==='submitted')return NextResponse.json({ok:true,alreadySubmitted:true});
  if(existing.status!=='in_progress')return NextResponse.json({error:'Setup cannot be submitted in its current state'},{status:409});
  const required=service==='website'?['businessName','contactName','email','businessType','domainOwnership']:['businessName','contactName','email','phone','businessType','workflow','features','users'];
  if(required.some(k=>!String(answers[k]||'').trim()))return NextResponse.json({error:'Please complete the required questions'},{status:400});
  const payload={answers,service_type:service,current_step:4,progress:100,status:'submitted',submitted_at:new Date().toISOString(),logo_path:logoPath||null};
  if(service==='business_software'&&selection)payload.plan_selection=selection;
  const saved=await fetch(SB+'/rest/v1/onboarding?tenant_id=eq.'+tenantId+'&status=eq.in_progress',{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(payload),cache:'no-store'});
  if(!saved.ok){console.error('Onboarding submission rejected',saved.status,await saved.text());return NextResponse.json({error:'Database rejected submission. Please contact support.'},{status:502})}
  const rows=await saved.json();
  if(rows.length!==1)return NextResponse.json({error:'Submission could not be confirmed'},{status:409});
  return NextResponse.json({ok:true});
 }catch(e){console.error('Onboarding submission error',e);return NextResponse.json({error:'Submission failed unexpectedly'},{status:500})}
}
