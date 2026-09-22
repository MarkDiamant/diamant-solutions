import { NextResponse } from "next/server";
import { centralRest, tenantRecord } from "../../../../../../lib/business-software/db";

export async function GET(_request,{params}){
  const slug=String((await params).slug||"").toLowerCase();
  const tenant=await tenantRecord(slug);
  if(!tenant||tenant.status!=="active")return NextResponse.json({error:"Tenant not found"},{status:404});
  const r=await centralRest(`business_software_tenant_settings?tenant_id=eq.${encodeURIComponent(tenant.id)}&select=business_name,logo_url,accent_colour,phone,email,website,address,company_number,vat_number,timezone,currency,quote_prefix,invoice_prefix,features&limit=1`);
  if(!r.ok)return NextResponse.json({error:"Unable to load tenant settings"},{status:500});
  const settings=(await r.json())?.[0]||null;
  return NextResponse.json({tenant:{slug:tenant.slug,canonicalHost:tenant.canonical_host,billingMode:tenant.billing_mode,referenceTenant:Boolean(tenant.reference_tenant)},settings},{headers:{"Cache-Control":"private, no-store"}});
}
