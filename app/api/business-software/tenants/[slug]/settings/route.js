import { NextResponse } from "next/server";
import { publicTenantSettings, tenantRecord } from "../../../../../../lib/business-software/db";

export async function GET(_request,{params}){
  const slug=String((await params).slug||"").toLowerCase();
  const tenant=await tenantRecord(slug);
  if(!tenant||tenant.status!=="active")return NextResponse.json({error:"Tenant not found"},{status:404});
  const settings=await publicTenantSettings(slug);
  if(!settings)return NextResponse.json({error:"Tenant settings not found"},{status:404});
  return NextResponse.json({tenant:{slug:tenant.slug,canonicalHost:tenant.canonical_host,billingMode:tenant.billing_mode,referenceTenant:Boolean(tenant.reference_tenant)},settings},{headers:{"Cache-Control":"private, no-store"}});
}
