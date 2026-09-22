import crypto from "crypto";
import { NextResponse } from "next/server";
import { centralRest } from "../../../../../../lib/business-software/db";

const TOKEN_URL="https://oauth2.googleapis.com/token";
const USERINFO_URL="https://openidconnect.googleapis.com/v1/userinfo";

function hash(value){return crypto.createHash("sha256").update(value).digest("hex")}

function key(){const raw=process.env.DS_INTEGRATION_ENCRYPTION_KEY;if(!raw)throw new Error("Integration encryption key is not configured");return crypto.createHash("sha256").update(raw).digest()}

function encrypt(value){
  if(!value)return null;
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key(),iv);
  const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]),tag=cipher.getAuthTag();
  return [iv,tag,encrypted].map(v=>v.toString("base64url")).join(".");
}

function safeReturn(origin,path="/admin/integrations"){
  const u=new URL(origin);u.pathname=path;u.search="";u.hash="";return u.toString();
}

export async function GET(request){
  const url=new URL(request.url),code=url.searchParams.get("code"),state=url.searchParams.get("state");
  if(!code||!state)return NextResponse.json({error:"Missing OAuth response"},{status:400});
  const stateHash=hash(state);
  const txRes=await centralRest(`business_software_oauth_transactions?state_hash=eq.${encodeURIComponent(stateHash)}&provider=eq.google&consumed_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id,tenant_id,return_origin&limit=1`);
  if(!txRes.ok)return NextResponse.json({error:"Unable to validate connection"},{status:500});
  const tx=(await txRes.json())?.[0];
  if(!tx)return NextResponse.json({error:"Connection request expired or invalid"},{status:400});
  const callback=`${url.origin}/api/business-software/oauth/google/callback`;
  const tokenRes=await fetch(TOKEN_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID||"",client_secret:process.env.GOOGLE_CLIENT_SECRET||"",redirect_uri:callback,grant_type:"authorization_code"})});
  const token=await tokenRes.json().catch(()=>({}));
  if(!tokenRes.ok||!token.access_token)return NextResponse.redirect(new URL("/admin/integrations?google=error",tx.return_origin));
  const infoRes=await fetch(USERINFO_URL,{headers:{Authorization:`Bearer ${token.access_token}`}});
  const info=await infoRes.json().catch(()=>({}));
  if(!infoRes.ok||!info.email)return NextResponse.redirect(new URL("/admin/integrations?google=error",tx.return_origin));
  const expiresAt=token.expires_in?new Date(Date.now()+Number(token.expires_in)*1000).toISOString():null;
  let refreshCipher=null;if(token.refresh_token)refreshCipher=encrypt(token.refresh_token);else{const existing=await centralRest(`business_software_integrations?tenant_id=eq.${encodeURIComponent(tx.tenant_id)}&provider=eq.google&select=refresh_token_ciphertext&limit=1`);if(existing.ok)refreshCipher=(await existing.json())?.[0]?.refresh_token_ciphertext||null;}
  const upsert=await centralRest("business_software_integrations?on_conflict=tenant_id,provider",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({tenant_id:tx.tenant_id,provider:"google",provider_account:info.email,status:"connected",scopes:String(token.scope||"").split(" ").filter(Boolean),connected_at:new Date().toISOString(),disconnected_at:null,access_token_ciphertext:encrypt(token.access_token),refresh_token_ciphertext:refreshCipher,token_expires_at:expiresAt,metadata:{email_verified:Boolean(info.email_verified)}})});
  if(!upsert.ok)return NextResponse.redirect(new URL("/admin/integrations?google=error",tx.return_origin));
  await centralRest(`business_software_oauth_transactions?id=eq.${encodeURIComponent(tx.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({consumed_at:new Date().toISOString()})});
  return NextResponse.redirect(safeReturn(tx.return_origin)+"?google=connected");
}
