import { NextResponse } from "next/server";
import { centralRest, tenantRecord } from "../../../../../../lib/business-software/db";

export async function DELETE(_request,{params}){
  const p=await params,slug=String(p.slug||"").toLowerCase(),provider=String(p.provider||"").toLowerCase();
  if(!["google","microsoft","xero","stripe","quickbooks"].includes(provider))return NextResponse.json({error:"Provider not supported"},{status:404});
  const tenant=await tenantRecord(slug);
  if(!tenant)return NextResponse.json({error:"Tenant not found"},{status:404});
  const r=await centralRest(`business_software_integrations?tenant_id=eq.${encodeURIComponent(tenant.id)}&provider=eq.${encodeURIComponent(provider)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"disconnected",access_token_ciphertext:null,refresh_token_ciphertext:null,token_expires_at:null,disconnected_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
  if(!r.ok)return NextResponse.json({error:"Unable to disconnect integration"},{status:500});
  return NextResponse.json({ok:true});
}
