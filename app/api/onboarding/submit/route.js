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
  const {tenantId,service,answers,logoPath,selection}=body;
  if(!/^[0-9a-f-]{36}$/i.test(tenantId||'')||!['website','business_software'].includes(service)||!answers||typeof answers!=='object'||Array.isArray(answers))return NextResponse.json({error:'Invalid submission'},{status:400});
  const member=await fetch(SB+'/rest/v1/tenant_members?user_id=eq.'+encodeURIComponent(user.id)+'&tenant_id=eq.'+encodeURIComponent(tenantId)+'&select=tenant_id',{headers:getHeaders(),cache:'no-store'});
  if(!member.ok){console.error('Membership lookup failed',member.status,await member.text());return NextResponse.json({error:'We could not complete your submission right now. Your answers are safe; please try again shortly.'},{status:502})}
  const members=await member.json();
  if(!members.length)return NextResponse.json({error:'We could not confirm access to this setup. Please contact support.'},{status:403});
  const current=await fetch(SB+'/rest/v1/onboarding?tenant_id=eq.'+tenantId+'&select=status,service_type&limit=1',{headers:getHeaders(),cache:'no-store'});
  if(!current.ok)return NextResponse.json({error:'Could not load setup'},{status:502});
  const existing=(await current.json())[0];
  if(!existing||existing.service_type!==service)return NextResponse.json({error:'Setup not found'},{status:404});
  if(existing.status==='submitted')return NextResponse.json({ok:true,alreadySubmitted:true});
  if(!['in_progress','awaiting_clarification'].includes(existing.status))return NextResponse.json({error:'Setup cannot be submitted in its current state'},{status:409});
  const required=service==='website'?['businessName','contactName','email','businessType','domainOwnership']:['businessName','contactName','email','phone','businessType','workflow','features','users'];
  if(required.some(k=>!String(answers[k]||'').trim()))return NextResponse.json({error:'Please complete the required questions'},{status:400});
  const moduleNames=['Prospects','Customers','Customer-specific pricing','Quotes','Sales orders','Deliveries','Returns','Jobs','Tasks','Scheduling','Files','Campaigns','Price book','Purchasing','Inventory','Goods received','Job allocations','Workforce','Timesheets','Labour costing','Invoices','Payments','Job finances','Money overview','Xero','Ruby AI'];
  const selectedModules=Array.isArray(answers.optionalModules)?[...new Set(answers.optionalModules.filter(x=>moduleNames.includes(x)))]:[];
  const proposedConfig=service==='business_software'?{
   version:2,reviewRequired:true,approved:false,modules:{enabled:selectedModules,hidden:moduleNames.filter(x=>!selectedModules.includes(x))},
   business:{name:String(answers.businessName||'').trim(),type:String(answers.businessType||''),terminology:String(answers.terminology||answers.workName||''),branding:{colours:String(answers.colours||''),logoPath:logoPath||null}},
   tasks:[
    {key:'verify_subscription',label:'Verify paid subscription and user seats',status:'pending'},
    {key:'review_branding',label:'Approve branding and business terminology',status:'pending'},
    {key:'configure_modules',label:'Review module visibility, permissions and dependencies',status:'pending'},
    {key:'configure_workflows',label:'Configure jobs, quotes, tasks and business workflows',status:'pending'},
    {key:'configure_finance',label:'Review VAT, invoices, payment terms and reporting',status:'pending'},
    ...(selectedModules.some(x=>['Inventory','Purchasing','Goods received','Job allocations'].includes(x))?[{key:'configure_stock',label:'Approve warehouses, stock costs and purchasing defaults',status:'pending'}]:[]),
    ...(selectedModules.some(x=>['Workforce','Timesheets','Labour costing'].includes(x))?[{key:'configure_workforce',label:'Review staff roles, rates and timesheets',status:'pending'}]:[]),
    ...(selectedModules.includes('Xero')?[{key:'authorise_xero',label:'Customer authorisation required for Xero',status:'pending'}]:[]),
    {key:'review_imports',label:'Review and approve any data imports',status:'pending'},
    {key:'client_approval',label:'Obtain customer approval of configured BMS',status:'pending'},
    {key:'activate',label:'Final internal approval before customer access',status:'pending'}
   ]
  }:null;
  const payload={answers,service_type:service,current_step:service==='business_software'?99:4,progress:100,status:'submitted',submitted_at:new Date().toISOString(),logo_path:logoPath||null,...(proposedConfig?{proposed_config:proposedConfig}:{})};
  if(service==='business_software'&&selection)payload.plan_selection=selection;
  const saved=await fetch(SB+'/rest/v1/onboarding?tenant_id=eq.'+tenantId+'&status=eq.'+encodeURIComponent(existing.status),{method:'PATCH',headers:{...getHeaders(),Prefer:'return=representation'},body:JSON.stringify(payload),cache:'no-store'});
  if(!saved.ok){console.error('Onboarding submission rejected',saved.status,await saved.text());return NextResponse.json({error:'Database rejected submission. Please contact support.'},{status:502})}
  const rows=await saved.json();
  if(rows.length!==1)return NextResponse.json({error:'Submission could not be confirmed'},{status:409});
  return NextResponse.json({ok:true});
 }catch(e){console.error('Onboarding submission error',e);return NextResponse.json({error:'Submission failed unexpectedly'},{status:500})}
}
