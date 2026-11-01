import crypto from "crypto";
import {centralRest} from "@/lib/business-software/db";

const enc=encodeURIComponent;
function decrypt(value:string|null){if(!value||!process.env.DS_INTEGRATION_ENCRYPTION_KEY)return null;try{const [iv,tag,data]=value.split(".").map(x=>Buffer.from(x,"base64url"));const key=crypto.createHash("sha256").update(process.env.DS_INTEGRATION_ENCRYPTION_KEY).digest();const d=crypto.createDecipheriv("aes-256-gcm",key,iv);d.setAuthTag(tag);return Buffer.concat([d.update(data),d.final()]).toString("utf8");}catch{return null;}}
function encrypt(value:string){const iv=crypto.randomBytes(12),key=crypto.createHash("sha256").update(process.env.DS_INTEGRATION_ENCRYPTION_KEY!).digest(),e=crypto.createCipheriv("aes-256-gcm",key,iv),data=Buffer.concat([e.update(value,"utf8"),e.final()]);return [iv,e.getAuthTag(),data].map(x=>x.toString("base64url")).join(".");}
async function rows(path:string){const r=await centralRest(path,{cache:"no-store"});if(!r.ok)throw new Error("Database read failed: "+r.status);const b=await r.json();if(!Array.isArray(b))throw new Error("Invalid database response");return b;}
class XeroRateLimitError extends Error{constructor(readonly retryAfterSeconds:number){super("Xero rate limit reached (429); retry after "+retryAfterSeconds+" seconds");}}
function assertXeroResponse(response:Response,context:string){if(response.status===429){const raw=Number(response.headers.get("retry-after")||60);throw new XeroRateLimitError(Number.isFinite(raw)&&raw>0?raw:60);}if(!response.ok)throw new Error(context+" "+response.status);}
async function access(tenantId:string){
 const row=(await rows("business_software_integrations?tenant_id=eq."+enc(tenantId)+"&provider=eq.xero&status=eq.connected&select=external_tenant_id,access_token_ciphertext,refresh_token_ciphertext,token_expires_at&limit=1"))[0];
 if(!row?.external_tenant_id)throw new Error("No connected Xero organisation");
 let token=decrypt(row.access_token_ciphertext);
 if(!token||!row.token_expires_at||new Date(row.token_expires_at).getTime()<Date.now()+90000){
  const refresh=decrypt(row.refresh_token_ciphertext);
  if(!refresh||!process.env.XERO_CLIENT_ID||!process.env.XERO_CLIENT_SECRET)throw new Error("Xero reauthorisation required");
  const auth=Buffer.from(process.env.XERO_CLIENT_ID+":"+process.env.XERO_CLIENT_SECRET).toString("base64");
  const r=await fetch("https://identity.xero.com/connect/token",{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",refresh_token:refresh}),cache:"no-store"});
  const b=await r.json().catch(()=>({}));
  if(!r.ok||!b.access_token)throw new Error("Xero token refresh failed");
  token=String(b.access_token);
  const saved=await centralRest("business_software_integrations?tenant_id=eq."+enc(tenantId)+"&provider=eq.xero&status=eq.connected",{method:"PATCH",body:JSON.stringify({access_token_ciphertext:encrypt(token),refresh_token_ciphertext:encrypt(String(b.refresh_token||refresh)),token_expires_at:new Date(Date.now()+Number(b.expires_in||1800)*1000).toISOString(),updated_at:new Date().toISOString()})});
  if(!saved.ok)throw new Error("Could not persist rotated Xero token");
 }
 return {token,organisation:String(row.external_tenant_id)};
}
export async function syncXeroJobInvoices(tenantId:string,jobId:string){
 const invoices=await rows("business_software_invoices?tenant_id=eq."+enc(tenantId)+"&job_id=eq."+enc(jobId)+"&provider=eq.xero&external_invoice_id=not.is.null&select=id,external_invoice_id,status&limit=50");
 if(!invoices.length)return {checked:0,updated:0,message:"No linked Xero invoices on this job"};
 const credentials=await access(tenantId);let updated=0;
 for(const invoice of invoices){
  const response=await fetch("https://api.xero.com/api.xro/2.0/Invoices/"+enc(String(invoice.external_invoice_id)),{headers:{Authorization:"Bearer "+credentials.token,"xero-tenant-id":credentials.organisation,Accept:"application/json"},cache:"no-store"});
  assertXeroResponse(response,"Xero invoice lookup");
  const x=(await response.json()).Invoices?.[0];
  if(!x||x.Type!=="ACCREC"||String(x.InvoiceID).toLowerCase()!==String(invoice.external_invoice_id).toLowerCase())throw new Error("Xero sales invoice identity mismatch");
  const total=Number(x.Total),due=Number(x.AmountDue),paid=Number(x.AmountPaid),credited=Number(x.AmountCredited||0);
  if(![total,due,paid,credited].every(Number.isFinite)||Math.min(total,due,paid,credited)<0||Math.abs(total-due-paid-credited)>0.02)throw new Error("Xero invoice amounts failed reconciliation");
  const status=String(x.Status||invoice.status);
  if(status.toUpperCase()==="PAID"&&due>0.01)throw new Error("Xero invoice status and balance disagree");
  const save=await centralRest("business_software_invoices?id=eq."+enc(String(invoice.id))+"&tenant_id=eq."+enc(tenantId)+"&job_id=eq."+enc(jobId)+"&provider=eq.xero&external_invoice_id=eq."+enc(String(invoice.external_invoice_id)),{method:"PATCH",body:JSON.stringify({status,invoice_number:x.InvoiceNumber||null,total,amount_due:due,amount_paid:paid,currency_code:x.CurrencyCode||"GBP",synced_at:new Date().toISOString()})});
  if(!save.ok)throw new Error("Could not save Xero invoice payments");
  updated++;
 }
 return {checked:invoices.length,updated};
}
