import crypto from "crypto";
import {NextResponse} from "next/server";
import {centralRest} from "../../../../../../lib/business-software/db";
const hash=v=>crypto.createHash("sha256").update(v).digest("hex");
function encrypt(value){if(!value||!process.env.DS_INTEGRATION_ENCRYPTION_KEY)throw new Error("Integration encryption is not configured");const key=crypto.createHash("sha256").update(process.env.DS_INTEGRATION_ENCRYPTION_KEY).digest(),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key,iv),encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return [iv,cipher.getAuthTag(),encrypted].map(x=>x.toString("base64url")).join(".");}
function redirect(origin,result){let u;try{u=new URL(origin);if(u.protocol!=="https:"||!(u.hostname==="diamantsolutions.co.uk"||u.hostname.endsWith(".diamantsolutions.co.uk")||u.hostname.endsWith(".vercel.app")))throw Error("Invalid origin");}catch{u=new URL("https://bms.diamantsolutions.co.uk");}u.pathname="/admin/integrations";u.search="?quickbooks="+result;u.hash="";return NextResponse.redirect(u);}
export async function GET(request){
 try{
  const url=new URL(request.url),code=url.searchParams.get("code"),state=url.searchParams.get("state"),realmId=url.searchParams.get("realmId");
  if(!code||!state||!realmId||!/^[0-9]+$/.test(realmId))return NextResponse.json({error:"Invalid QuickBooks authorisation response"},{status:400});
  const txResponse=await centralRest("business_software_oauth_transactions?state_hash=eq."+encodeURIComponent(hash(state))+"&provider=eq.quickbooks&consumed_at=is.null&expires_at=gt."+encodeURIComponent(new Date().toISOString())+"&select=id,tenant_id,return_origin&limit=1");
  if(!txResponse.ok)return NextResponse.json({error:"Unable to validate authorisation"},{status:503});
  const tx=(await txResponse.json())[0];if(!tx)return NextResponse.json({error:"Authorisation expired or already used"},{status:400});
  const claim=await centralRest("business_software_oauth_transactions?id=eq."+encodeURIComponent(tx.id)+"&consumed_at=is.null",{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({consumed_at:new Date().toISOString()})});
  const claimed=claim.ok?await claim.json():[];if(!claimed.length)return NextResponse.json({error:"Authorisation already used"},{status:409});
  if(!process.env.QBO_CLIENT_ID||!process.env.QBO_CLIENT_SECRET)return redirect(tx.return_origin,"config_error");
  const basic=Buffer.from(process.env.QBO_CLIENT_ID+":"+process.env.QBO_CLIENT_SECRET).toString("base64");
  const response=await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",{method:"POST",headers:{Authorization:"Basic "+basic,Accept:"application/json","Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",code,redirect_uri:url.origin+"/api/business-software/oauth/quickbooks/callback"}),cache:"no-store"});
  const token=await response.json().catch(()=>({}));if(!response.ok||!token.access_token||!token.refresh_token)return redirect(tx.return_origin,"error");
  const saved=await centralRest("business_software_integrations?on_conflict=tenant_id,provider",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({tenant_id:tx.tenant_id,provider:"quickbooks",provider_account:realmId,status:"connected",external_tenant_id:realmId,scopes:["com.intuit.quickbooks.accounting"],connected_at:new Date().toISOString(),disconnected_at:null,access_token_ciphertext:encrypt(String(token.access_token)),refresh_token_ciphertext:encrypt(String(token.refresh_token)),token_expires_at:new Date(Date.now()+Number(token.expires_in||3600)*1000).toISOString(),metadata:{refresh_expires_in:Number(token.x_refresh_token_expires_in||0)}})});
  if(!saved.ok)return redirect(tx.return_origin,"error");
  await centralRest("business_software_audit_events",{method:"POST",body:JSON.stringify({tenant_id:tx.tenant_id,actor:"oauth",action:"connected",entity_type:"integration",entity_id:"quickbooks",metadata:{provider:"quickbooks"}})});
  return redirect(tx.return_origin,"connected");
 }catch(error){console.error("QuickBooks OAuth callback failed",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Unable to complete QuickBooks authorisation"},{status:500});}
}
