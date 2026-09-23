import {NextResponse} from "next/server";
import {centralRest} from "../../../../lib/business-software/db";
import {requireTenantMember} from "../../../../lib/business-software/tenant-access";
const TENANT="3ebc2265-8842-4826-b464-71783d6cf841";
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||""));
export async function POST(request){
 if(process.env.BMS_STAGING_PREVIEW!=="true"||process.env.DS_SUPABASE_URL!=="https://sfxeyydkwzlduflpmidd.supabase.co")
 return NextResponse.json({error:"Staging only"},{status:403});
 const session=await requireTenantMember(request,TENANT,["owner","admin","manager"]);
 if(!session.ok)return NextResponse.json({error:session.error},{status:session.status});
 const b=await request.json().catch(()=>null);
 if(!b||!uuid(b.customer_id)||typeof b.job_type!=="string"||b.job_type.trim().length<2||b.job_type.length>150||
 (b.manager!=null&&(typeof b.manager!=="string"||b.manager.length>100))||
 (b.notes!=null&&(typeof b.notes!=="string"||b.notes.length>3000)))
 return NextResponse.json({error:"Invalid job"},{status:400});
 try{
  const r=await centralRest("rpc/bms_staging_create_mj_job",{method:"POST",body:JSON.stringify({p_tenant:TENANT,p_customer:b.customer_id,p_job_type:b.job_type,p_manager:b.manager||null,p_notes:b.notes||null})});
  if(!r.ok)return NextResponse.json({error:"Job could not be created"},{status:409});
  return NextResponse.json({job:await r.json()},{status:201});
 }catch{return NextResponse.json({error:"Job creation unavailable"},{status:503})}
}
