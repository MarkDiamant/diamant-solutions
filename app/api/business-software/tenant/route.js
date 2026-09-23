import { NextResponse } from "next/server";
import { tenantRecord } from "../../../../lib/business-software/db";

function cleanHost(value=""){return String(value).trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0].split(":")[0]}

export async function GET(request) {
  const url=new URL(request.url),slug=url.searchParams.get("slug"),host=cleanHost(url.searchParams.get("host")||request.headers.get("host")||"");
  const row=await tenantRecord(slug,slug?null:host);
  const tenant=row?{id:row.id,slug:row.slug,name:row.business_name,canonicalHost:row.canonical_host,status:row.status,billingMode:row.billing_mode,referenceTenant:Boolean(row.reference_tenant)}:null;
  // Never fabricate an M&J tenant when the central DS registry has no row.
  // Legacy configuration remains in the old M&J deployment until migration.
  if(!tenant)return NextResponse.json({error:"Tenant not found in the central DS registry"},{status:404,headers:{"Cache-Control":"no-store"}});
  return NextResponse.json({tenant},{headers:{"Cache-Control":"private, max-age=0, must-revalidate"}});
}
