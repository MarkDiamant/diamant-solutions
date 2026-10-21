import {NextResponse} from "next/server";
import crypto from "crypto";
import {centralRest} from "@/lib/business-software/db";

export const maxDuration=60;
const enc=encodeURIComponent;
function decrypt(value:string|null){if(!value||!process.env.DS_INTEGRATION_ENCRYPTION_KEY)return null;try{const [iv,tag,data]=value.split(".").map(x=>Buffer.from(x,"base64url"));const key=crypto.createHash("sha256").update(process.env.DS_INTEGRATION_ENCRYPTION_KEY).digest();const d=crypto.createDecipheriv("aes-256-gcm",key,iv);d.setAuthTag(tag);return Buffer.concat([d.update(data),d.final()]).toString("utf8");}catch{return null;}}
function encrypt(value:string){const iv=crypto.randomBytes(12),key=crypto.createHash("sha256").update(process.env.DS_INTEGRATION_ENCRYPTION_KEY!).digest(),e=crypto.createCipheriv("aes-256-gcm",key,iv),data=Buffer.concat([e.update(value,"utf8"),e.final()]);return [iv,e.getAuthTag(),data].map(x=>x.toString("base64url")).join(".");}
async function rows(path:string){const r=await centralRest(path,{cache:"no-store"});if(!r.ok)throw new Error("Database read failed: "+r.status);const b=await r.json();if(!Array.isArray(b))throw new Error("Invalid database response");return b;}
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
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get("authorization")!=="Bearer "+process.env.CRON_SECRET)return NextResponse.json({error:"Unauthorised"},{status:401});
 try{
  const invoices=await rows("business_software_invoices?provider=eq.xero&external_invoice_id=not.is.null&select=id,tenant_id,external_invoice_id,total,amount_paid,amount_due,status&order=synced_at.asc.nullsfirst&limit=100");
  const groups=new Map<string,typeof invoices>();for(const invoice of invoices){const key=String(invoice.tenant_id);if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(invoice);}
  let checked=0,updated=0,failed=0;const errors:string[]=[];
  for(const [tenantId,items] of groups){
   try{
    const credentials=await access(tenantId);
    for(const invoice of items){
     try{
      const r=await fetch("https://api.xero.com/api.xro/2.0/Invoices/"+enc(String(invoice.external_invoice_id)),{headers:{Authorization:"Bearer "+credentials.token,"xero-tenant-id":credentials.organisation,Accept:"application/json"},cache:"no-store"});
      if(!r.ok)throw new Error("Xero invoice lookup "+r.status);
      const x=(await r.json()).Invoices?.[0];
      if(!x||String(x.InvoiceID).toLowerCase()!==String(invoice.external_invoice_id).toLowerCase())throw new Error("Xero invoice ID mismatch");
      if(x.Type!=="ACCREC")throw new Error("Expected customer sales invoice; refused to reconcile purchase bill as incoming payment");
      const next={status:String(x.Status||invoice.status),invoice_number:x.InvoiceNumber||null,total:Number(x.Total??0),amount_due:Number(x.AmountDue??0),amount_paid:Number(x.AmountPaid??0),currency_code:x.CurrencyCode||"GBP",synced_at:new Date().toISOString()};
      if(![next.total,next.amount_due,next.amount_paid].every(Number.isFinite)||next.total<0||next.amount_due<0||next.amount_paid<0)throw new Error("Invalid Xero invoice amounts");
      const credited=Number(x.AmountCredited??0);if(!Number.isFinite(credited)||credited<0)throw new Error("Invalid Xero credit amount");
      if(Math.abs(next.total-next.amount_due-next.amount_paid-credited)>0.02)throw new Error("Xero invoice balance does not reconcile after credits; local record left unchanged");
      if(next.status.toUpperCase()==="PAID"&&next.amount_due>0.01)throw new Error("Xero reports PAID but an amount is still due; local record left unchanged");
      const saved=await centralRest("business_software_invoices?id=eq."+enc(String(invoice.id))+"&tenant_id=eq."+enc(tenantId)+"&provider=eq.xero&external_invoice_id=eq."+enc(String(invoice.external_invoice_id)),{method:"PATCH",body:JSON.stringify(next)});
      if(!saved.ok)throw new Error("Database invoice update "+saved.status);
      checked++;if(Number(invoice.amount_paid)!==next.amount_paid||Number(invoice.amount_due)!==next.amount_due||invoice.status!==next.status)updated++;
     }catch(e){failed++;errors.push(String(invoice.id)+": "+(e instanceof Error?e.message:"Unknown error"));}
    }
   }catch(e){failed+=items.length;errors.push("Tenant "+tenantId+": "+(e instanceof Error?e.message:"Unknown error"));}
  }
  // Contractor bill matching is intentionally advisory until a bill-to-job link is confirmed.
  // Xero purchase bills are ACCPAY; never treat these as customer receipts.
  const contractorBillCandidates:any[]=[];let contractorPaymentsPosted=0,contractorPaymentsAlreadyPosted=0;const autoPostContractors=process.env.BMS_XERO_AUTO_CONTRACTOR_PAYMENTS==="true";
  const connectedTenants=await rows("business_software_integrations?provider=eq.xero&status=eq.connected&select=tenant_id&limit=1000");
  const tenantIds=[...new Set([...groups.keys(),...connectedTenants.map((r:any)=>String(r.tenant_id)).filter(Boolean)])];
  for(const tenantId of tenantIds){
   try{
    const credentials=await access(tenantId);
    const [jobs,people,contractors]=await Promise.all([rows("business_software_jobs?tenant_id=eq."+enc(tenantId)+"&select=id,reference&limit=1000"),rows("business_software_job_people?tenant_id=eq."+enc(tenantId)+"&select=id,job_id,person_id,agreed_cost,paid_amount&limit=1000"),rows("business_software_people?tenant_id=eq."+enc(tenantId)+"&select=id,name,company,relationship_type&limit=1000")]);const contractorById=new Map<string,any>(contractors.map((person:any)=>[String(person.id),person]));const cleanName=(value:any)=>String(value||"").toLowerCase().replace(/[^a-z0-9]/g,"");
    const byReference=new Map<string,any>();const duplicateReferences=new Set<string>();for(const job of jobs){const ref=String(job.reference||"").trim().toUpperCase();if(!ref)continue;if(byReference.has(ref))duplicateReferences.add(ref);else byReference.set(ref,job);}
    for(let page=1;page<=5;page++){
     const response=await fetch("https://api.xero.com/api.xro/2.0/Invoices?where="+enc('Type=="ACCPAY"')+"&page="+page,{headers:{Authorization:"Bearer "+credentials.token,"xero-tenant-id":credentials.organisation,Accept:"application/json"},cache:"no-store"});
     if(!response.ok)throw new Error("Xero purchase bill lookup "+response.status);
     const bills=(await response.json()).Invoices||[];
     if(!Array.isArray(bills))throw new Error("Invalid Xero purchase bill response");
     for(const bill of bills){
     const reference=String(bill.Reference||"").trim().toUpperCase();const job:any=byReference.get(reference);
     if(!job||duplicateReferences.has(reference)||!bill.InvoiceID||Number(bill.AmountPaid||0)<=0||!Number.isFinite(Number(bill.AmountPaid)))continue;
     if(["VOIDED","DELETED","DRAFT","SUBMITTED"].includes(String(bill.Status||"").toUpperCase()))continue;
     const detailResponse=await fetch("https://api.xero.com/api.xro/2.0/Invoices/"+enc(String(bill.InvoiceID)),{headers:{Authorization:"Bearer "+credentials.token,"xero-tenant-id":credentials.organisation,Accept:"application/json"},cache:"no-store"});if(!detailResponse.ok)throw new Error("Xero purchase bill detail lookup "+detailResponse.status);const detailed=(await detailResponse.json()).Invoices?.[0];if(!detailed||detailed.Type!=="ACCPAY"||String(detailed.InvoiceID).toLowerCase()!==String(bill.InvoiceID).toLowerCase())throw new Error("Xero purchase bill detail mismatch");const billPayments=Array.isArray(detailed.Payments)?detailed.Payments:[];const paymentIds=billPayments.map((payment:any)=>String(payment.PaymentID||"")).filter(Boolean);const uniquePaymentIds=new Set(paymentIds);const detailedPaymentTotal=billPayments.reduce((sum:number,payment:any)=>sum+Number(payment.Amount||0),0);const billContactMatches=String(detailed.Contact?.ContactID||"")===String(bill.Contact?.ContactID||"")&&Boolean(detailed.Contact?.ContactID);const paymentsReconciled=paymentIds.length===billPayments.length&&uniquePaymentIds.size===paymentIds.length&&billPayments.every((payment:any)=>Number.isFinite(Number(payment.Amount))&&Number(payment.Amount)>0)&&Math.abs(detailedPaymentTotal-Number(detailed.AmountPaid||0))<=0.02;const assignments=people.filter((person:any)=>person.job_id===job.id);const assignedPerson=assignments.length===1?contractorById.get(String(assignments[0].person_id)):null;const supplierName=cleanName(detailed.Contact?.Name);const supplierMatches=Boolean(supplierName&&assignedPerson&&[assignedPerson.name,assignedPerson.company].some(name=>cleanName(name)===supplierName));if(autoPostContractors&&assignments.length===1&&supplierMatches&&billContactMatches&&paymentsReconciled&&paymentIds.length>0){for(const payment of billPayments){const paymentDate=String(payment.Date||"");const parsedDate=/^\\d{4}-\\d{2}-\\d{2}/.test(paymentDate)?new Date(paymentDate):null;if(!parsedDate||!Number.isFinite(parsedDate.getTime())){errors.push("Xero contractor payment "+payment.PaymentID+": unsupported payment date");continue;}const posted=await centralRest("rpc/bms_post_xero_contractor_payment",{method:"POST",body:JSON.stringify({p_tenant_id:tenantId,p_job_id:job.id,p_assignment_id:assignments[0].id,p_xero_payment_id:String(payment.PaymentID),p_amount:Number(payment.Amount),p_paid_at:parsedDate.toISOString(),p_counterparty:String(detailed.Contact?.Name||"")})});if(!posted.ok){errors.push("Xero contractor payment "+payment.PaymentID+": posting failed ("+posted.status+")");continue;}const result=await posted.json().catch(()=>null);if(result?.already_posted)contractorPaymentsAlreadyPosted++;else if(result?.ok)contractorPaymentsPosted++;else errors.push("Xero contractor payment "+payment.PaymentID+": posting was not confirmed");}}contractorBillCandidates.push({tenant_id:tenantId,job_reference:job.reference,job_id:job.id,xero_bill_id:bill.InvoiceID,xero_bill_number:bill.InvoiceNumber||null,supplier:bill.Contact?.Name||null,supplier_xero_contact_id:bill.Contact?.ContactID||null,amount_paid:Number(bill.AmountPaid),amount_due:Number(bill.AmountDue||0),xero_payment_ids:paymentIds,payments_reconciled:paymentsReconciled,xero_payments:billPayments.map((payment:any)=>({payment_id:String(payment.PaymentID||""),amount:Number(payment.Amount||0),date:payment.Date||null})),assignment_count:assignments.length,supplier_matches_assignment:supplierMatches,review_reasons:[...(assignments.length!==1?["Job does not have exactly one assigned contractor"]:[]),...(!supplierMatches?["Xero supplier does not exactly match the assigned contractor name or company"]:[]),...(!billContactMatches?["Xero supplier contact ID differs between bill summary and detail"]:[]),...(!paymentsReconciled?["Xero payment IDs or paid amounts could not be reconciled"]:[])],action:assignments.length===1&&supplierMatches&&billContactMatches&&paymentsReconciled&&paymentIds.length>0?"verify_supplier_matches_assignment_before_posting":"review_match_before_posting"});
     }
     if(bills.length<100)break;
    }
   }catch(e){errors.push("Contractor matching for tenant "+tenantId+": "+(e instanceof Error?e.message:"Unknown error"));}
  }
  return NextResponse.json({checked,updated,failed,contractor_auto_post_enabled:autoPostContractors,contractor_payments_posted:contractorPaymentsPosted,contractor_payments_already_posted:contractorPaymentsAlreadyPosted,contractor_bill_candidates:contractorBillCandidates.slice(0,100),errors:errors.slice(0,10)},{status:failed||errors.length?207:200,headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Xero reconciliation failed"},{status:500});}
}
