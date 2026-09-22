import crypto from "crypto";
import { NextResponse } from "next/server";
import { centralRest, tenantRecord } from "../../../../../../lib/business-software/db";
import { verifyTenantHandoff } from "../../../../../../lib/business-software/handoff";

function auth(body,slug){
  const origin=String(body.origin||""),email=String(body.email||"").toLowerCase(),ts=body.ts,signature=body.sig;
  return {ok:verifyTenantHandoff({slug,origin,email,ts,signature}),email};
}
function hash(value){return crypto.createHash("sha256").update(String(value||"")).digest("hex")}

export async function POST(request,{params}){
 try{
  const slug=String((await params).slug||"").toLowerCase(),body=await request.json(),access=auth(body,slug);
  if(!access.ok||!access.email)return NextResponse.json({error:"Authorised tenant session required"},{status:401});
  const tenant=await tenantRecord(slug);if(!tenant)return NextResponse.json({error:"Tenant not found"},{status:404});
  const action=String(body.action||"validate");
  if(action==="issue"){
    const token=crypto.randomBytes(32).toString("base64url"),now=new Date().toISOString();
    const r=await centralRest("business_software_active_sessions?on_conflict=tenant_id,user_email",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({tenant_id:tenant.id,user_email:access.email,session_hash:hash(token),issued_at:now,last_seen_at:now})});
    if(!r.ok)return NextResponse.json({error:"Unable to create session"},{status:500});
    return NextResponse.json({ok:true,sessionToken:token},{headers:{"Cache-Control":"private, no-store"}});
  }
  const token=String(body.sessionToken||"");if(!token)return NextResponse.json({valid:false},{status:401});
  const r=await centralRest(`business_software_active_sessions?tenant_id=eq.${encodeURIComponent(tenant.id)}&user_email=eq.${encodeURIComponent(access.email)}&session_hash=eq.${encodeURIComponent(hash(token))}&select=issued_at&limit=1`);
  const valid=r.ok&&Boolean((await r.json())?.[0]);
  if(!valid)return NextResponse.json({valid:false},{status:401});
  await centralRest(`business_software_active_sessions?tenant_id=eq.${encodeURIComponent(tenant.id)}&user_email=eq.${encodeURIComponent(access.email)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({last_seen_at:new Date().toISOString()})});
  return NextResponse.json({valid:true},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to validate session"},{status:500})}
}

export async function DELETE(request,{params}){
 try{
  const slug=String((await params).slug||"").toLowerCase(),body=await request.json(),access=auth(body,slug);
  if(!access.ok||!access.email)return NextResponse.json({error:"Authorised tenant session required"},{status:401});
  const tenant=await tenantRecord(slug);if(!tenant)return NextResponse.json({error:"Tenant not found"},{status:404});
  await centralRest(`business_software_active_sessions?tenant_id=eq.${encodeURIComponent(tenant.id)}&user_email=eq.${encodeURIComponent(access.email)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Unable to end session"},{status:500})}
}
