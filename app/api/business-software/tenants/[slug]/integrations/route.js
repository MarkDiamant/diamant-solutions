import { NextResponse } from "next/server";
import { centralRest, tenantRecord } from "../../../../../lib/business-software/db";

export async function GET(request,{params}){
  const slug=String((await params).slug||"").toLowerCase();
  const tenant=await tenantRecord(slug);
  if(!tenant)return NextResponse.json({error:"Tenant not found"},{status:404});
  const r=await centralRest(`business_software_integrations?tenant_id=eq.${encodeURIComponent(tenant.id)}&select=provider,provider_account,status,scopes,connected_at,token_expires_at,updated_at`);
  if(!r.ok)return NextResponse.json({error:"Unable to load integrations"},{status:500});
  return NextResponse.json({integrations:await r.json()},{headers:{"Cache-Control":"private, no-store"}});
}
