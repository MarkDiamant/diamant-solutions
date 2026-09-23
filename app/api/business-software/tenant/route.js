import { NextResponse } from "next/server";
import { tenantRecord } from "../../../../lib/business-software/db";

function cleanHost(value=""){return String(value).trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0].split(":")[0]}

export async function GET(request) {
  const url=new URL(request.url),slug=url.searchParams.get("slug"),host=cleanHost(url.searchParams.get("host")||request.headers.get("host")||"");
  const row=await tenantRecord(slug,slug?null:host);
  const tenant=row?{id:row.id,slug:row.slug,name:row.business_name,canonicalHost:row.canonical_host,status:row.status,billingMode:row.billing_mode,referenceTenant:Boolean(row.reference_tenant)}:null;
  if(!tenant)return NextResponse.json({error:"Tenant not found in the central DS registry"},{status:404,headers:{"Cache-Control":"no-store"}});
  return NextResponse.json({tenant},{headers:{"Cache-Control":"private, max-age=0, must-revalidate"}});
}

export async function POST(request) {
  try{
    const body=await request.json(),slug=String(body.slug||"").toLowerCase();
    if(!slug)return NextResponse.json({error:"Tenant slug required"},{status:400});
    const row=await tenantRecord(slug);
    if(!row)return NextResponse.json({error:"Tenant not found"},{status:404});
    return NextResponse.json({tenant:{id:row.id,slug:row.slug,name:row.business_name,canonicalHost:row.canonical_host,status:row.status,billingMode:row.billing_mode,referenceTenant:Boolean(row.reference_tenant)}},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({error:"Unable to resolve tenant"},{status:500})}
}
