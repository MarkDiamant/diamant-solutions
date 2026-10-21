import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const SB=process.env.DS_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
const SK=process.env.DS_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers=()=>({apikey:SK,Authorization:'Bearer '+SK});
export async function GET(request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!SB||!SK)return NextResponse.json({error:'Storage configuration missing'},{status:503});
 try{
 const r=await fetch(SB+'/rest/v1/onboarding?service_type=eq.website&status=eq.submitted&select=tenant_id,answers,logo_path&limit=100',{headers:headers(),cache:'no-store'});
 if(!r.ok)throw Error('Unable to retrieve submissions: '+r.status);
 const records=await r.json();let transferred=0;const errors=[];
 for(const record of records){
  const answers=record.answers||{},paths=[...new Set([...(answers.siteImagePaths||[]),...(record.logo_path?[record.logo_path]:[])])],published=[];
  for(const path of paths){
   if(typeof path!=='string'||!path.startsWith(record.tenant_id+'/website-assets/')||path.includes('..'))continue;
   const urlPath=path.split('/').map(encodeURIComponent).join('/');
   const source=await fetch(SB+'/storage/v1/object/authenticated/onboarding-assets/'+urlPath,{headers:headers(),cache:'no-store'});
   if(!source.ok){errors.push({tenant:record.tenant_id,file:path,status:source.status});continue}
   const mime=source.headers.get('content-type')||'image/jpeg';
   if(!['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'].includes(mime))continue;
   const dest=await fetch(SB+'/storage/v1/object/website-published-assets/'+urlPath,{method:'POST',headers:{...headers(),'content-type':mime,'x-upsert':'true'},body:await source.arrayBuffer()});
   if(!dest.ok){errors.push({tenant:record.tenant_id,file:path,status:dest.status});continue}
   published.push({originalPath:path,url:SB+'/storage/v1/object/public/website-published-assets/'+urlPath});transferred++;
  }
  if(published.length){
   const updated={...answers,publishedSiteImages:published.filter(p=>p.originalPath!==record.logo_path).map(p=>p.url),publishedLogoUrl:published.find(p=>p.originalPath===record.logo_path)?.url||null};
   const save=await fetch(SB+'/rest/v1/onboarding?tenant_id=eq.'+encodeURIComponent(record.tenant_id)+'&service_type=eq.website',{method:'PATCH',headers:{...headers(),'content-type':'application/json'},body:JSON.stringify({answers:updated})});
   if(!save.ok)errors.push({tenant:record.tenant_id,error:'Could not save published image URLs'});
  }
 }
 return NextResponse.json({ok:errors.length===0,records:records.length,transferred,errors},{status:errors.length?207:200});
 }catch(e){console.error('Website asset transfer failed',e);return NextResponse.json({error:'Website asset transfer failed'},{status:500})}
}