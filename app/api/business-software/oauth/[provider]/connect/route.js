import crypto from "crypto";
import { NextResponse } from "next/server";
import { centralRest, tenantRecord } from "../../../../../../lib/business-software/db";
import { verifyTenantHandoff } from "../../../../../../lib/business-software/handoff";
import { tenantFromSlug } from "../../../../../../lib/business-software/tenants";

const GOOGLE_AUTH="https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES=["openid","email","https://www.googleapis.com/auth/gmail.send"];

function allowedOrigin(tenant,origin){
  try{
    const u=new URL(origin);
    return u.protocol==="https:"&&(u.hostname===tenant.canonical_host||u.hostname==="mjmetal.co.uk"||u.hostname==="www.mjmetal.co.uk");
  }catch{return false}
}

export async function GET(request,{params}){
  const provider=String((await params).provider||"").toLowerCase();
  if(provider!=="google")return NextResponse.json({error:"Provider not supported"},{status:404});
  const url=new URL(request.url),slug=url.searchParams.get("tenant"),returnOrigin=url.searchParams.get("return_origin")||"",email=url.searchParams.get("email")||"",ts=url.searchParams.get("ts")||"",signature=url.searchParams.get("sig")||"";
  if(!slug)return NextResponse.json({error:"Tenant is required"},{status:400});
  if(!verifyTenantHandoff({slug,origin:returnOrigin,email,ts,signature}))return NextResponse.json({error:"Authorised tenant session required"},{status:401});
  let tenant=await tenantRecord(slug);
  if(!tenant){const fallback=tenantFromSlug(slug);if(fallback)tenant={id:fallback.id,slug:fallback.slug,business_name:fallback.name,canonical_host:fallback.canonicalHost,status:fallback.status,billing_mode:fallback.billingMode,reference_tenant:fallback.referenceTenant};}
  if(!tenant||tenant.status!=="active")return NextResponse.json({error:"Tenant not found"},{status:404});
  if(!allowedOrigin(tenant,returnOrigin))return NextResponse.json({error:"Return origin is not allowed"},{status:400});
  if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET||!process.env.DS_INTEGRATION_ENCRYPTION_KEY)return NextResponse.json({error:"Google integration is not configured"},{status:503});
  if(!tenant.id||!String(tenant.id).includes("-")){
    const central=await tenantRecord(slug);
    if(!central?.id||!String(central.id).includes("-"))return NextResponse.json({error:"Tenant registry is not fully configured"},{status:503});
    tenant=central;
  }
  const state=crypto.randomBytes(32).toString("base64url"),hash=crypto.createHash("sha256").update(state).digest("hex");
  const expires=new Date(Date.now()+10*60*1000).toISOString();
  const tx=await centralRest("business_software_oauth_transactions",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({state_hash:hash,tenant_id:tenant.id,provider:"google",return_origin:returnOrigin,expires_at:expires})});
  if(!tx.ok){const detail=await tx.text().catch(()=>"");console.error("OAuth transaction create failed",{slug,tenantId:tenant.id,status:tx.status,detail});return NextResponse.json({error:"Unable to start connection"},{status:500});}
  const callback=`${url.origin}/api/business-software/oauth/google/callback`;
  const auth=new URL(GOOGLE_AUTH);auth.searchParams.set("client_id",process.env.GOOGLE_CLIENT_ID);auth.searchParams.set("redirect_uri",callback);auth.searchParams.set("response_type","code");auth.searchParams.set("access_type","offline");auth.searchParams.set("prompt","consent");auth.searchParams.set("scope",SCOPES.join(" "));auth.searchParams.set("state",state);
  return NextResponse.redirect(auth);
}
