import crypto from "crypto";

function secret(){return process.env.DS_TENANT_HANDOFF_SECRET||""}
function safeEqual(a,b){try{return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b))}catch{return false}}
export function handoffPayload({slug,origin,email,ts}){return [String(slug||"").toLowerCase(),String(origin||""),String(email||"").toLowerCase(),String(ts||"")].join("|")}
export function verifyTenantHandoff({slug,origin,email,ts,signature}){
  const key=secret(),stamp=Number(ts);
  if(!key||!signature||!Number.isFinite(stamp)||Math.abs(Date.now()-stamp)>5*60*1000)return false;
  const expected=crypto.createHmac("sha256",key).update(handoffPayload({slug,origin,email,ts:stamp})).digest("base64url");
  return safeEqual(expected,String(signature));
}
