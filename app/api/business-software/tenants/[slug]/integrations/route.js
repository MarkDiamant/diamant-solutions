import { NextResponse } from "next/server";
import { centralRest, tenantRecord } from "../../../../../../lib/business-software/db";
import { verifyTenantHandoff } from "../../../../../../lib/business-software/handoff";

function auth(request,slug){
  const u=new URL(request.url),origin=u.searchParams.get("origin")||"",email=u.searchParams.get("email")||"",ts=u.searchParams.get("ts")||"",signature=u.searchParams.get("sig")||"";
  return {ok:verifyTenantHandoff({slug,origin,email,ts,signature}),email};
}

export async function GET(request,{params}){
  const slug=String((await params).slug||"").toLowerCase(),access=auth(request,slug);
  if(!access.ok)return NextResponse.json({error:"Authorised tenant session required"},{status:401});
  const tenant=await tenantRecord(slug);
  if(!tenant)return NextResponse.json({error:"Tenant not found"},{status:404});
  const r=await centralRest(`business_software_integrations?tenant_id=eq.${encodeURIComponent(tenant.id)}&select=provider,provider_account,status,scopes,connected_at,token_expires_at,updated_at`);
  if(!r.ok)return NextResponse.json({error:"Unable to load integrations"},{status:500});
  return NextResponse.json({integrations:await r.json()},{headers:{"Cache-Control":"private, no-store"}});
}

export async function DELETE(request,{params}){
  const slug=String((await params).slug||"").toLowerCase(),access=auth(request,slug);
  if(!access.ok)return NextResponse.json({error:"Authorised tenant session required"},{status:401});
  const u=new URL(request.url),provider=String(u.searchParams.get("provider")||"").toLowerCase();
  if(provider!=="google")return NextResponse.json({error:"Provider not supported"},{status:400});
  const tenant=await tenantRecord(slug);
  if(!tenant)return NextResponse.json({error:"Tenant not found"},{status:404});
  const r=await centralRest(`business_software_integrations?tenant_id=eq.${encodeURIComponent(tenant.id)}&provider=eq.${encodeURIComponent(provider)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"disconnected",disconnected_at:new Date().toISOString(),access_token_ciphertext:null,refresh_token_ciphertext:null,token_expires_at:null})});
  if(!r.ok)return NextResponse.json({error:"Unable to disconnect integration"},{status:500});
  await centralRest("business_software_audit_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({tenant_id:tenant.id,actor:access.email,action:"disconnected",entity_type:"integration",entity_id:provider,metadata:{provider}})});
  return NextResponse.json({ok:true});
}
