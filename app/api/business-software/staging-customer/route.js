import {NextResponse} from "next/server";
import {centralRest} from "../../../../lib/business-software/db";
import {requireTenantMember} from "../../../../lib/business-software/tenant-access";
const TENANT="3ebc2265-8842-4826-b464-71783d6cf841";
const fields=["first_name","last_name","phone","email","address_line_1","address_line_2","city","postcode","notes"];
export async function POST(request){
 if(process.env.BMS_STAGING_PREVIEW!=="true"||process.env.DS_SUPABASE_URL!=="https://sfxeyydkwzlduflpmidd.supabase.co")return NextResponse.json({error:"Staging only"},{status:403});
 const session=await requireTenantMember(request,TENANT,["owner","admin","manager"]);
 if(!session.ok)return NextResponse.json({error:session.error},{status:session.status});
 const body=await request.json().catch(()=>null);
 if(!body||typeof body!=="object"||Array.isArray(body)||!body.first_name||typeof body.first_name!=="string"||body.first_name.length>120||Object.entries(body).some(([k,v])=>!fields.includes(k)||(v!==null&&(typeof v!=="string"||v.length>1000))))return NextResponse.json({error:"Invalid customer"},{status:400});
 try{
 const r=await centralRest("business_software_customers",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({...body,tenant_id:TENANT})});
 if(!r.ok)return NextResponse.json({error:"Unable to create customer"},{status:409});
 return NextResponse.json({customer:(await r.json())[0]},{status:201});
 }catch{return NextResponse.json({error:"Customer creation unavailable"},{status:503})}
}
