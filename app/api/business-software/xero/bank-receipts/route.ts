import {NextResponse} from "next/server";
import crypto from "crypto";
import {centralRest} from "@/lib/business-software/db";
export const maxDuration=60;
const enc=encodeURIComponent;
async function rows(path:string){const r=await centralRest(path,{cache:"no-store"});if(!r.ok)throw new Error("Database read failed "+r.status);return r.json();}
function decrypt(value:string|null){if(!value||!process.env.DS_INTEGRATION_ENCRYPTION_KEY)return null;try{const [iv,tag,data]=value.split(".").map(x=>Buffer.from(x,"base64url"));const key=crypto.createHash("sha256").update(process.env.DS_INTEGRATION_ENCRYPTION_KEY).digest(),d=crypto.createDecipheriv("aes-256-gcm",key,iv);d.setAuthTag(tag);return Buffer.concat([d.update(data),d.final()]).toString("utf8");}catch{return null;}}
function encrypt(value:string){const iv=crypto.randomBytes(12),key=crypto.createHash("sha256").update(process.env.DS_INTEGRATION_ENCRYPTION_KEY!).digest(),e=crypto.createCipheriv("aes-256-gcm",key,iv),data=Buffer.concat([e.update(value,"utf8"),e.final()]);return [iv,e.getAuthTag(),data].map(x=>x.toString("base64url")).join(".");}
async function credentials(tenantId:string){
 const row=(await rows("business_software_integrations?tenant_id=eq."+enc(tenantId)+"&provider=eq.xero&status=eq.connected&select=external_tenant_id,access_token_ciphertext,refresh_token_ciphertext,token_expires_at,scopes&limit=1"))[0];
 if(!row?.external_tenant_id||!Array.isArray(row.scopes)||!row.scopes.includes("accounting.banktransactions.read"))throw new Error("Bank receipt access not authorised");
 let token=decrypt(row.access_token_ciphertext);
 if(!token||!row.token_expires_at||new Date(row.token_expires_at).getTime()<Date.now()+90000){
  const refresh=decrypt(row.refresh_token_ciphertext);
  if(!refresh||!process.env.XERO_CLIENT_ID||!process.env.XERO_CLIENT_SECRET)throw new Error("Xero reauthorisation required");
  const auth=Buffer.from(process.env.XERO_CLIENT_ID+":"+process.env.XERO_CLIENT_SECRET).toString("base64");
  const r=await fetch("https://identity.xero.com/connect/token",{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",refresh_token:refresh}),cache:"no-store"});
  const b=await r.json().catch(()=>({}));if(!r.ok||!b.access_token)throw new Error("Xero token refresh failed");
  token=String(b.access_token);
  const saved=await centralRest("business_software_integrations?tenant_id=eq."+enc(tenantId)+"&provider=eq.xero&status=eq.connected",{method:"PATCH",body:JSON.stringify({access_token_ciphertext:encrypt(token),refresh_token_ciphertext:encrypt(String(b.refresh_token||refresh)),token_expires_at:new Date(Date.now()+Number(b.expires_in||1800)*1000).toISOString(),updated_at:new Date().toISOString()})});
  if(!saved.ok)throw new Error("Could not persist Xero token");
 }
 return {token,organisation:String(row.external_tenant_id)};
}
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get("authorization")!=="Bearer "+process.env.CRON_SECRET)return NextResponse.json({error:"Unauthorised"},{status:401});
 let checked=0,imported=0,linked=0,review=0,failed=0;const errors:string[]=[];
 try{
  const tenants=await rows("business_software_integrations?provider=eq.xero&status=eq.connected&select=tenant_id,scopes&limit=100");
  for(const row of tenants){const tenantId=String(row.tenant_id);if(!Array.isArray(row.scopes)||!row.scopes.includes("accounting.banktransactions.read"))continue;
   try{
    const previous={checked,imported,linked,review,failed};
    const creds=await credentials(tenantId);
    const [jobs,payments,links,invoices]=await Promise.all([
     rows("business_software_jobs?tenant_id=eq."+enc(tenantId)+"&select=id,reference&limit=5000"),
     rows("business_software_payments?tenant_id=eq."+enc(tenantId)+"&direction=eq.customer_in&select=id,job_id,amount,payment_type,paid_at&limit=5000"),
     rows("business_software_payment_external_links?tenant_id=eq."+enc(tenantId)+"&provider=eq.xero&select=payment_id,external_transaction_id&limit=5000"),
     rows("business_software_invoices?tenant_id=eq."+enc(tenantId)+"&select=job_id&limit=5000")]);
    const byRef=new Map<string,any[]>();for(const j of jobs){const ref=String(j.reference||"").toUpperCase().trim().replace(/[- ]/g,"");if(!ref)continue;byRef.set(ref,[...(byRef.get(ref)||[]),j]);}
    const linkedIds=new Set(links.map((x:any)=>String(x.external_transaction_id))),linkedPayments=new Set(links.map((x:any)=>String(x.payment_id))),invoiced=new Set(invoices.map((x:any)=>String(x.job_id)));
    for(let page=1;page<=100;page++){
     const r=await fetch("https://api.xero.com/api.xro/2.0/BankTransactions?where="+enc('Type=="RECEIVE" AND IsReconciled==true')+"&page="+page,{headers:{Authorization:"Bearer "+creds.token,"xero-tenant-id":creds.organisation,Accept:"application/json"},cache:"no-store"});
     if(r.status===429){const raw=Number(r.headers.get("retry-after")||60);errors.push("Xero rate limited for tenant "+tenantId+"; retry after "+(Number.isFinite(raw)&&raw>0?raw:60)+" seconds");failed++;break;}if(!r.ok)throw new Error("Xero bank transaction lookup "+r.status);
     const txs=(await r.json()).BankTransactions||[];if(!Array.isArray(txs))throw new Error("Invalid bank transaction response");
     for(const tx of txs){checked++;
      if(!tx.BankTransactionID||tx.Type!=="RECEIVE"||tx.IsReconciled!==true||tx.Status!=="AUTHORISED"||String(tx.CurrencyCode||"GBP")!=="GBP"||linkedIds.has(String(tx.BankTransactionID)))continue;
      const amount=Number(tx.Total),date=String(tx.DateString||"");if(!Number.isFinite(amount)||amount<=0||!/^\d{4}-\d{2}-\d{2}/.test(date))continue;
      // Reconciled RECEIVE transactions can still be loans, transfers or other non-customer income.
      // Do not infer a customer receipt solely from the direction or a coincidental job reference.
      const accountClassification=[...(tx.LineItems||[]).map((x:any)=>[x.AccountCode,x.Description,x.LineAmount].filter(Boolean).join(" ")),tx.Reference,tx.Contact?.Name].filter(Boolean).join(" ");
      if(/\b(?:director(?:'s)?\s+loan|loan|inter(?:nal)?\s*account\s*transfer|bank\s*transfer\s*between\s*accounts|capital\s*introduced|owner(?:'s)?\s*contribution)\b/i.test(accountClassification)){
       review++;
       const queued=await centralRest("business_software_accounting_unmatched_receipts?on_conflict=tenant_id,provider,external_transaction_id",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({tenant_id:tenantId,provider:"xero",external_transaction_id:String(tx.BankTransactionID),amount,paid_at:date.slice(0,10),reference:String(tx.Reference||"").slice(0,500),contact_name:String(tx.Contact?.Name||"").slice(0,200)})});
       if(!queued.ok)failed++;
       continue;
      }
      const source=[tx.Reference,...(tx.LineItems||[]).map((x:any)=>x.Description)].filter(Boolean).join(" ").toUpperCase();
      const refs=[...new Set((source.match(/\b[A-Z]{1,8}[- ]?\d{2,8}\b/g)||[]).map((x:string)=>x.replace(/[- ]/g,"")))];
      const matches=[...new Map(refs.flatMap((ref:string)=>byRef.get(ref)||[]).map((j:any)=>[String(j.id),j])).values()];
      if(matches.length!==1||invoiced.has(String(matches[0].id))){
       review++;
       const queued=await centralRest("business_software_accounting_unmatched_receipts?on_conflict=tenant_id,provider,external_transaction_id",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({tenant_id:tenantId,provider:"xero",external_transaction_id:String(tx.BankTransactionID),amount,paid_at:date.slice(0,10),reference:String(tx.Reference||"").slice(0,500),contact_name:String(tx.Contact?.Name||"").slice(0,200)})});if(!queued.ok)failed++;
       continue;
      }
      const jobId=String(matches[0].id);
      const candidates=payments.filter((p:any)=>String(p.job_id)===jobId&&p.payment_type!=="xero_bank_receipt"&&Math.abs(Number(p.amount)-amount)<0.01&&!linkedPayments.has(String(p.id)));
      // Never link an undated historical entry or a different-date manual receipt
      // by amount alone. A matching value is not proof of the same bank payment.
      if(candidates.length>1||candidates.some((p:any)=>String(p.paid_at||"").slice(0,10)!==date.slice(0,10))){
       review++;
       const queued=await centralRest("business_software_accounting_unmatched_receipts?on_conflict=tenant_id,provider,external_transaction_id",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({tenant_id:tenantId,provider:"xero",external_transaction_id:String(tx.BankTransactionID),amount,paid_at:date.slice(0,10),reference:String(tx.Reference||"").slice(0,500),contact_name:String(tx.Contact?.Name||"").slice(0,200)})});
       if(!queued.ok)failed++;
       continue;
      }
      // Never mutate customer payment ledgers from a background discovery run.
      // Even a matching job, amount and date is only a proposed match until a
      // human has checked the Xero transaction, contact and allocation.
      review++;
      const queued=await centralRest("business_software_accounting_unmatched_receipts?on_conflict=tenant_id,provider,external_transaction_id",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({tenant_id:tenantId,provider:"xero",external_transaction_id:String(tx.BankTransactionID),amount,paid_at:date.slice(0,10),reference:String(tx.Reference||"").slice(0,500),contact_name:String(tx.Contact?.Name||"").slice(0,200)})});
      if(!queued.ok)failed++;

     }
     if(txs.length<100)break;
    }
    const saved=await centralRest("business_software_accounting_sync_runs",{method:"POST",body:JSON.stringify({tenant_id:tenantId,provider:"xero",sync_type:"bank_receipts",status:failed>previous.failed?"partial":"success",checked:checked-previous.checked,imported:imported-previous.imported,matched_existing:linked-previous.linked,needs_review:review-previous.review,failed:failed-previous.failed})});if(!saved.ok)console.error("Unable to save Xero bank sync history",tenantId);
   }catch(e){failed++;errors.push("Tenant "+tenantId+": "+(e instanceof Error?e.message:"Unknown error"));const saved=await centralRest("business_software_accounting_sync_runs",{method:"POST",body:JSON.stringify({tenant_id:tenantId,provider:"xero",sync_type:"bank_receipts",status:"failed",failed:1,error_message:(e instanceof Error?e.message:"Unknown error").slice(0,1000)})});if(!saved.ok)console.error("Unable to save Xero bank sync failure",tenantId);}
  }
  console.info("BMS Xero bank receipt sync",{checked,imported,linked,review,failed,errors:errors.slice(0,5)});
  return NextResponse.json({checked,imported,linked,review,failed,errors:errors.slice(0,5)},{status:failed?207:200});
 }catch(e){console.error("BMS Xero bank receipt sync failed",e);return NextResponse.json({error:"Bank receipt sync failed"},{status:500});}
}
