import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireTenantMember } from "../../../../../lib/business-software/tenant-access";
import { centralRest } from "../../../../../lib/business-software/db";

const TENANT="3ebc2265-8842-4826-b464-71783d6cf841";
export async function POST(request){
  if(process.env.BMS_STAGING_PREVIEW!=="true" ||
    process.env.DS_SUPABASE_URL!=="https://sfxeyydkwzlduflpmidd.supabase.co")
    return NextResponse.json({error:"Isolated staging only"},{status:403});
  const session=await requireTenantMember(request,TENANT,["owner","admin"]);
  if(!session.ok)return NextResponse.json({error:session.error},{status:session.status});
  if(!process.env.XERO_CLIENT_ID||!process.env.XERO_CLIENT_SECRET||!process.env.DS_INTEGRATION_ENCRYPTION_KEY)
    return NextResponse.json({error:"Staging Xero OAuth credentials not configured"},{status:503});
  const origin=new URL(request.url).origin;
  const state=crypto.randomBytes(32).toString("base64url");
  const tx=await centralRest("business_software_oauth_transactions",{
    method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({tenant_id:TENANT,provider:"xero",state_hash:crypto.createHash("sha256").update(state).digest("hex"),return_origin:origin,expires_at:new Date(Date.now()+600000).toISOString()})
  });
  if(!tx.ok)return NextResponse.json({error:"Unable to start Xero authorisation"},{status:503});
  const callback=origin+"/api/business-software/oauth/xero/callback";
  const auth=new URL("https://login.xero.com/identity/connect/authorize");
  for(const [key,value] of Object.entries({client_id:process.env.XERO_CLIENT_ID,redirect_uri:callback,response_type:"code",scope:"openid profile email offline_access accounting.transactions accounting.contacts accounting.settings",state}))auth.searchParams.set(key,value);
  return NextResponse.json({url:auth.toString()},{headers:{"Cache-Control":"no-store"}});
}
