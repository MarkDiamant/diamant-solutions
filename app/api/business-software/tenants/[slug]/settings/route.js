import { NextResponse } from "next/server";
import { centralRest, tenantRecord } from "../../../../../../lib/business-software/db";
import { verifyTenantHandoff } from "../../../../../../lib/business-software/handoff";

function auth(body,slug){
 const origin=String(body.origin||""),email=String(body.email||"").toLowerCase(),ts=body.ts,signature=body.sig;
 return verifyTenantHandoff({slug,origin,email,ts,signature})&&email?{origin,email}:null;
}
export async function POST(request,{params}){
 try{
  const slug=String((await params).slug||"").toLowerCase(),body=await request.json(),access=auth(body,slug);
  if(!access)return NextResponse.json({error:"Authorised tenant session required"},{status:401});
  const tenant=await tenantRecord(slug);if(!tenant||tenant.status!=="active")return NextResponse.json({error:"Tenant not found"},{status:404});
  const r=await centralRest("business_software_tenant_settings?tenant_id=eq."+encodeURIComponent(tenant.id)+"&select=*&limit=1");
  if(!r.ok)return NextResponse.json({error:"Unable to load tenant settings"},{status:500});
  const settings=(await r.json())?.[0];if(!settings)return NextResponse.json({error:"Tenant settings not found"},{status:404});
  return NextResponse.json({settings},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to load settings"},{status:500})}
}
export async function PUT(request,{params}){
 try{
  const slug=String((await params).slug||"").toLowerCase(),body=await request.json(),access=auth(body,slug);
  if(!access)return NextResponse.json({error:"Authorised tenant session required"},{status:401});
  const tenant=await tenantRecord(slug);if(!tenant||tenant.status!=="active")return NextResponse.json({error:"Tenant not found"},{status:404});
  const appConfig=body.appConfig&&typeof body.appConfig==="object"?body.appConfig:null;
  if(!appConfig)return NextResponse.json({error:"Valid app configuration required"},{status:400});
  const businessDetails=appConfig.businessDetails||{};
  const patch={app_config:appConfig,business_name:String(appConfig.businessName||tenant.business_name||"").slice(0,160),logo_url:String(appConfig.logoUrl||"").slice(0,1000)||null,accent_colour:String(appConfig.accentColour||"").slice(0,32)||null,phone:String(businessDetails.phone||"").slice(0,80)||null,email:String(businessDetails.email||"").slice(0,254)||null,website:String(businessDetails.website||"").slice(0,300)||null,company_number:String(businessDetails.companyNumber||"").slice(0,80)||null,vat_number:String(businessDetails.vatNumber||"").slice(0,80)||null,updated_at:new Date().toISOString()};
  const r=await centralRest("business_software_tenant_settings?tenant_id=eq."+encodeURIComponent(tenant.id),{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)});
  if(!r.ok)return NextResponse.json({error:"Unable to save tenant settings"},{status:500});
  return NextResponse.json({ok:true,settings:(await r.json())?.[0]||null});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to save settings"},{status:500})}
}
