import { NextResponse } from "next/server";
import { publicTenant, tenantFromHost, tenantFromSlug } from "../../../../lib/business-software/tenants";
import { tenantRecord } from "../../../../lib/business-software/db";

function cleanHost(value=""){return String(value).trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0].split(":")[0]}

export async function GET(request) {
  const url=new URL(request.url),slug=url.searchParams.get("slug"),host=cleanHost(url.searchParams.get("host")||request.headers.get("host")||"");
  const row=await tenantRecord(slug,slug?null:host);
  const tenant=row?{id:row.slug,slug:row.slug,name:row.business_name,canonicalHost:row.canonical_host,status:row.status,billingMode:row.billing_mode,referenceTenant:Boolean(row.reference_tenant)}:null;
  const fallback=slug?tenantFromSlug(slug):tenantFromHost(host);
  const resolved=tenant||(fallback?publicTenant(fallback):null);
  if(!resolved)return NextResponse.json({error:"Tenant not found"},{status:404});
  return NextResponse.json({tenant:resolved},{headers:{"Cache-Control":"private, max-age=0, must-revalidate"}});
}
