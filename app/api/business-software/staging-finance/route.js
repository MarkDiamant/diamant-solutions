import { NextResponse } from "next/server";
import { centralRest } from "../../../../lib/business-software/db";
import { requireTenantMember } from "../../../../lib/business-software/tenant-access";
const TENANT="3ebc2265-8842-4826-b464-71783d6cf841";
const TABLES={
 payments:{table:"business_software_payments",required:["job_id","direction","payment_type","amount"],fields:["job_id","direction","payment_type","amount","payment_method","counterparty","paid_at","due_at","notes"],numeric:["amount"]},
 costs:{table:"business_software_job_costs",required:["job_id","category"],fields:["job_id","category","supplier","estimated_amount","actual_amount","paid_amount","notes","paid_at","due_at"],numeric:["estimated_amount","actual_amount","paid_amount"]}
};
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||""));
const headers={"Cache-Control":"no-store"};
export async function POST(request){
 if(process.env.BMS_STAGING_PREVIEW!=="true"||process.env.DS_SUPABASE_URL!=="https://sfxeyydkwzlduflpmidd.supabase.co")
  return NextResponse.json({error:"Isolated staging only"},{status:403,headers});
 const body=await request.json().catch(()=>null),spec=TABLES[body?.resource];
 if(!spec||body.tenant_id!==TENANT||!body.values||typeof body.values!=="object"||Array.isArray(body.values))
  return NextResponse.json({error:"Invalid request"},{status:400,headers});
 const values=body.values,entries=Object.entries(values);
 if(!entries.length||entries.some(([k,v])=>!spec.fields.includes(k)||(!spec.numeric.includes(k)&&v!==null&&typeof v!=="string")||(typeof v==="string"&&v.length>2000))||
   spec.required.some(k=>values[k]===undefined)||!uuid(values.job_id)||
   spec.numeric.some(k=>values[k]!==undefined&&values[k]!==null&&(!Number.isFinite(Number(values[k]))||Number(values[k])<0))||
   (body.resource==="payments"&&!["incoming","outgoing"].includes(values.direction)))
  return NextResponse.json({error:"Invalid fields or values"},{status:400,headers});
 const session=await requireTenantMember(request,TENANT,["owner","admin","manager"]);
 if(!session.ok)return NextResponse.json({error:session.error},{status:session.status,headers});
 try{
  const job=await centralRest("business_software_jobs?tenant_id=eq."+TENANT+"&id=eq."+encodeURIComponent(values.job_id)+"&select=id&limit=1");
  if(!job.ok||(await job.json()).length!==1)return NextResponse.json({error:"Job not found in this tenant"},{status:404,headers});
  const record={...values,tenant_id:TENANT};
  for(const field of spec.numeric)if(record[field]!==undefined&&record[field]!==null)record[field]=Number(record[field]);
  const result=await centralRest(spec.table,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(record)});
  if(!result.ok)return NextResponse.json({error:"Record rejected"},{status:409,headers});
  return NextResponse.json({record:(await result.json())[0]},{status:201,headers});
 }catch{return NextResponse.json({error:"Staging financial write unavailable"},{status:503,headers});}
}
