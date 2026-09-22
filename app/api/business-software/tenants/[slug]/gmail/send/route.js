import crypto from "crypto";
import { NextResponse } from "next/server";
import { centralRest, tenantRecord } from "../../../../../../lib/business-software/db";
import { verifyTenantHandoff } from "../../../../../../lib/business-software/handoff";

const TOKEN_URL="https://oauth2.googleapis.com/token",SEND_URL="https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
function key(){const raw=process.env.DS_INTEGRATION_ENCRYPTION_KEY;if(!raw)throw new Error("Integration encryption key is not configured");return crypto.createHash("sha256").update(raw).digest()}
function decrypt(value){const[a,b,c]=String(value||"").split(".");if(!a||!b||!c)throw new Error("Invalid encrypted token");const d=crypto.createDecipheriv("aes-256-gcm",key(),Buffer.from(a,"base64url"));d.setAuthTag(Buffer.from(b,"base64url"));return Buffer.concat([d.update(Buffer.from(c,"base64url")),d.final()]).toString("utf8")}
function encrypt(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key(),iv),out=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return[iv,cipher.getAuthTag(),out].map(x=>x.toString("base64url")).join(".")}
function b64(v){return Buffer.from(v).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function accessToken(row){
 if(row.access_token_ciphertext&&row.token_expires_at&&Date.parse(row.token_expires_at)>Date.now()+120000)return decrypt(row.access_token_ciphertext);
 if(!row.refresh_token_ciphertext)throw new Error("Gmail must be reconnected");
 const r=await fetch(TOKEN_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",refresh_token:decrypt(row.refresh_token_ciphertext),client_id:process.env.GOOGLE_CLIENT_ID||"",client_secret:process.env.GOOGLE_CLIENT_SECRET||""}),cache:"no-store"});const t=await r.json().catch(()=>({}));if(!r.ok||!t.access_token)throw new Error("Google token refresh failed");
 await centralRest(`business_software_integrations?tenant_id=eq.${encodeURIComponent(row.tenant_id)}&provider=eq.google`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({access_token_ciphertext:encrypt(t.access_token),token_expires_at:new Date(Date.now()+Number(t.expires_in||3600)*1000).toISOString()})});return t.access_token;
}
export async function POST(request,{params}){
 try{
  const slug=String((await params).slug||"").toLowerCase(),body=await request.json(),origin=String(body.origin||""),email=String(body.actorEmail||"").toLowerCase();
  if(!verifyTenantHandoff({slug,origin,email,ts:body.ts,signature:body.sig}))return NextResponse.json({error:"Authorised tenant session required"},{status:401});
  const tenant=await tenantRecord(slug);if(!tenant)return NextResponse.json({error:"Tenant not found"},{status:404});
  const r=await centralRest(`business_software_integrations?tenant_id=eq.${encodeURIComponent(tenant.id)}&provider=eq.google&status=eq.connected&select=*&limit=1`);const row=r.ok?(await r.json())?.[0]:null;if(!row)return NextResponse.json({error:"Gmail is not connected"},{status:409});
  const token=await accessToken(row),from=String(row.provider_account||""),to=String(body.to||"").trim(),subject=String(body.subject||"").slice(0,500),html=String(body.html||"");
  if(!from||!to||!subject||!html)return NextResponse.json({error:"Email details are incomplete"},{status:400});
  const boundary="ds_"+crypto.randomBytes(12).toString("hex"),name=String(body.fromName||"Business").replace(/[\r\n]/g," "),reply=String(body.replyTo||from).replace(/[\r\n]/g," ");
  const headers=[`From: ${name} <${from}>`,`To: ${to.replace(/[\r\n]/g,"")}`,`Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,`Reply-To: ${reply}`,"MIME-Version: 1.0",`Content-Type: multipart/mixed; boundary="${boundary}"`].join("\r\n");
  let raw=`${headers}\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(html).toString("base64")}\r\n`;
  if(body.attachment?.contentBase64){const filename=String(body.attachment.filename||"attachment").replace(/["\r\n]/g,""),mime=String(body.attachment.mimeType||"application/octet-stream").replace(/[\r\n]/g,"");raw+=`--${boundary}\r\nContent-Type: ${mime}; name="${filename}"\r\nContent-Disposition: attachment; filename="${filename}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${body.attachment.contentBase64}\r\n`;}raw+=`--${boundary}--`;
  const sent=await fetch(SEND_URL,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({raw:b64(raw)}),cache:"no-store"});const result=await sent.json().catch(()=>({}));if(!sent.ok)return NextResponse.json({error:result?.error?.message||"Gmail could not send the message"},{status:502});
  await centralRest("business_software_audit_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({tenant_id:tenant.id,actor:email,action:"email_sent",entity_type:"integration",entity_id:"google",metadata:{to,subject}})});
  return NextResponse.json({ok:true,from,messageId:result.id||null});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to send Gmail"},{status:500})}
}
