import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {centralRest} from "@/lib/business-software/db";
import {safeCsvCell} from "@/business-software-core/lib/safe-csv";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {reconcile,quoteTotals,agingBuckets}=require("@/business-software-core/lib/finance-reconcile.cjs");

export const dynamic="force-dynamic";
const url="https://iepqggrfenfqrqyzqyed.supabase.co";
const key="sb_publishable_ivTCLFGFroexc-3IHe25bg_qhzg_GIy";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requestKey=/^[a-zA-Z0-9:_-]{8,150}$/;
const response=(error:string,status:number)=>NextResponse.json({error},{status});
async function json(r:Response){return r.json().catch(()=>null)}
async function demoTenant(){
 const r=await centralRest("business_software_tenants?slug=eq.flooring-showcase-demo&select=id,slug&limit=1");
 if(!r.ok)throw Error("Demo tenant unavailable");
 const t=(await json(r))?.[0];
 if(!t||t.slug!=="flooring-showcase-demo"||!uuid.test(t.id))throw Error("Demo tenant not provisioned");
 return String(t.id);
}
async function memberAllowed(demoTenantId:string){
 // Demo mutations require a manager of THIS isolated fictional tenant.
 // A manager of an unrelated production tenant must never inherit demo write access.
 const jar=await cookies(),token=jar.get("bms_access_token")?.value;
 if(!token)return false;
 const user=await fetch(url+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token},cache:"no-store"});
 if(!user.ok)return false;
 const identity=await json(user),authId=String(identity?.id||"");
 if(!uuid.test(authId)||!uuid.test(demoTenantId))return false;
 const membership=await centralRest("business_software_users?auth_user_id=eq."+authId+"&tenant_id=eq."+demoTenantId+"&status=eq.active&role=in.(owner,admin,manager)&select=id&limit=1",{cache:"no-store"});
 if(!membership.ok)return false;
 const rows=await json(membership);
 return Array.isArray(rows)&&rows.length>0?authId:null;
}

async function owned(table:string,tenant:string,id:string,columns="id"){
 if(!uuid.test(id))throw Error("Invalid record identifier");
 const r=await centralRest(table+"?tenant_id=eq."+tenant+"&id=eq."+id+"&select="+columns+"&limit=1");
 if(!r.ok)throw Error("Record lookup failed");
 const row=(await json(r))?.[0];if(!row)throw Error("Record is not in the isolated demo tenant");
 return row;
}
async function rpc(name:string,body:Record<string,unknown>){
 const r=await centralRest("rpc/"+name,{method:"POST",body:JSON.stringify(body)});
 const data=await json(r);
 if(!r.ok)throw Error(String(data?.message||"Operation rejected").slice(0,200));
 return data;
}
/** Read-only fictional quote-to-invoice audit. Never queries another tenant. */
export async function GET(req:Request){
 try{
  const tenant=await demoTenant();
  if(!await memberAllowed(tenant))return response("Authenticated BMS manager required for fictional demo",403);
  const params=new URL(req.url).searchParams;
  if(params.get("list_jobs")==="true"){
   const jobs=await centralRest("business_software_jobs?tenant_id=eq."+tenant+"&select=id,reference,status,created_at&order=created_at.desc&limit=100",{cache:"no-store"});
   if(!jobs.ok)return response("Unable to list fictional tenant jobs",503);
   return NextResponse.json({fictional:true,jobs:await json(jobs)},{headers:{"Cache-Control":"private, no-store"}});
  }
  const job=params.get("job_id")||"";
  if(!uuid.test(job))return response("Valid fictional job_id required",400);
  await owned("business_software_jobs",tenant,job);
  const q=await centralRest("business_software_quotes?tenant_id=eq."+tenant+"&job_id=eq."+job+"&select=id,version,status,amount,vat_rate,scope_text,lead_time,created_at&order=version.desc&limit=100",{cache:"no-store"});
  const i=await centralRest("business_software_invoices?tenant_id=eq."+tenant+"&job_id=eq."+job+"&select=id,invoice_number,provider,status,total,amount_due,amount_paid,amount_credited,source_quote_id,invoice_date,due_date,created_at&order=created_at.desc&limit=100",{cache:"no-store"});
  const a=await centralRest("business_software_invoice_payment_allocations?tenant_id=eq."+tenant+"&job_id=eq."+job+"&select=invoice_id,payment_id,amount,created_at&order=created_at.desc&limit=500",{cache:"no-store"});
  const cr=await centralRest("business_software_invoice_credit_notes?tenant_id=eq."+tenant+"&job_id=eq."+job+"&select=id,invoice_id,credit_number,amount,reason,issued_at&order=issued_at.desc&limit=500",{cache:"no-store"});
  if(!q.ok||!i.ok||!a.ok||!cr.ok)throw Error("Unable to read fictional quote, invoice and payment ledger");
  const quotes=await json(q),invoices=await json(i),allocations=await json(a),credits=await json(cr);
  if(!Array.isArray(quotes)||!Array.isArray(invoices)||!Array.isArray(allocations)||!Array.isArray(credits))throw Error("Invalid fictional accounting ledger");
  const balances=reconcile(quotes,invoices);
  const quoteIds=new Set(quotes.map((x:any)=>x.id));
  const invoiceRows=invoices.map((x:any)=>({
   ...x,
   source_quote_valid:!!x.source_quote_id&&quoteIds.has(x.source_quote_id),
   external_sync: x.provider!=="internal",
   payment_allocation_total:allocations.filter((a:any)=>a.invoice_id===x.id).reduce((sum:number,a:any)=>sum+Number(a.amount||0),0),
   payment_reconciled:x.provider!=="internal"||Math.abs(allocations.filter((a:any)=>a.invoice_id===x.id).reduce((sum:number,a:any)=>sum+Number(a.amount||0),0)-Number(x.amount_paid||0))<0.011,
   overdue:!!x.due_date&&x.due_date<new Date().toISOString().slice(0,10)&&["issued","part_paid"].includes(String(x.status).toLowerCase())&&Number(x.amount_due)>0,
  }));
  if(params.get("format")==="pdf"){
   const kind=params.get("kind"),documentId=params.get("id")||"";
   if(!["quote","invoice"].includes(String(kind))||!uuid.test(documentId))return response("Valid financial document required",400);
   const selected=kind==="quote"?quotes.find((x:any)=>x.id===documentId):invoiceRows.find((x:any)=>x.id===documentId&&x.provider==="internal");
   if(!selected)return response("Financial document not found in the selected fictional job",404);
   const quote=kind==="quote"?selected:quotes.find((x:any)=>x.id===selected.source_quote_id);
   const net=quote?Number(quote.amount):null;
   const vat=quote?quoteTotals(quote.amount,quote.vat_rate):null;
   const total=kind==="invoice"?Number(selected.total):vat?.gross;
   if(!Number.isFinite(total)||total<0)return response("Invalid financial amount",409);
   const ref=kind==="invoice"?String(selected.invoice_number):"FLOOR-"+String(selected.version)+"-"+documentId.slice(0,8);
   // eslint-disable-next-line @typescript-eslint/no-require-imports
   const {pdfDocument}=require("@/business-software-core/lib/financial-pdf.cjs");
   const rows=[kind==="quote"?String(quote?.scope_text||"Flooring works quotation"):"Flooring services per approved quotation",...(net===null?[]:["Net: GBP "+net.toFixed(2),"VAT ("+Number(quote.vat_rate)+"%): GBP "+(vat?.vat||0).toFixed(2)]),"Total: GBP "+Number(total).toFixed(2),...(kind==="invoice"?["Paid: GBP "+Number(selected.amount_paid||0).toFixed(2),"Credited: GBP "+Number(selected.amount_credited||0).toFixed(2),"Outstanding: GBP "+Number(selected.amount_due||0).toFixed(2),"Due: "+String(selected.due_date||"Not issued")]:["Lead time: "+String(quote?.lead_time||"Not specified")])];
   const settingsResult=await centralRest("business_software_tenant_settings?tenant_id=eq."+tenant+"&select=accent_colour&limit=1",{cache:"no-store"});if(!settingsResult.ok)return response("Unable to load fictional tenant branding",503);const settingsRows=await json(settingsResult);const accent=String(settingsRows?.[0]?.accent_colour||"#263c54");const pdf=pdfDocument({title:kind==="quote"?"Quotation":"Invoice",issuer:"Oak & Stone Flooring Demo",brandColor:accent,reference:ref,recipient:"Fictional Flooring customer",items:rows,footer:"Fictional demonstration document. Not valid for commercial use."});
   return new Response(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":"attachment; filename="+JSON.stringify(ref.replace(/[^a-zA-Z0-9._-]/g,"_")+".pdf"),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }
  if(params.get("format")==="print"){
   const invoiceId=params.get("invoice_id")||"";
   if(!uuid.test(invoiceId))return response("Valid invoice_id required",400);
   const inv=invoiceRows.find((x:any)=>x.id===invoiceId&&x.provider==="internal");
   if(!inv)return response("Internal invoice not found in selected fictional job",404);
   const quote=quotes.find((x:any)=>x.id===inv.source_quote_id);
   const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]||ch));
   const gbp=(v:unknown)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(v||0));
   const net=quote?Number(quote.amount):null;
   const vat=net===null?null:Number(inv.total)-net;
   const page=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice ${esc(inv.invoice_number)}</title><style>body{font:16px system-ui,Arial,sans-serif;max-width:820px;margin:48px auto;color:#202936;padding:0 20px}header{display:flex;justify-content:space-between;border-bottom:2px solid #273d52;padding-bottom:24px}h1{margin:0}table{width:100%;border-collapse:collapse;margin:35px 0}td,th{padding:12px;text-align:left;border-bottom:1px solid #d4dce5}td:last-child,th:last-child{text-align:right}.total{font-size:22px;font-weight:bold}.note{color:#536477}.actions{margin:18px 0}@media print{.actions{display:none}body{margin:0;max-width:none}}</style></head><body><div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div><header><div><h1>INVOICE</h1><p>Oak &amp; Stone Flooring Demo</p><p class="note">Fictional demonstration invoice, not a tax invoice</p></div><div><strong>${esc(inv.invoice_number)}</strong><p>Status: ${esc(inv.status)}</p><p>Issued: ${esc(inv.invoice_date||"Not issued")}</p><p>Due: ${esc(inv.due_date||"Not set")}</p></div></header><p>Job reference: ${esc(job)}</p><table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody><tr><td>Approved quotation ${esc(quote?.version??"")} ${quote?("(revision "+esc(quote.version)+")"):""}</td><td>${esc(net===null?"See total":gbp(net))}</td></tr>${vat===null?"":`<tr><td>VAT (${esc(quote?.vat_rate)}%)</td><td>${esc(gbp(vat))}</td></tr>`}</tbody></table><p class="total">Invoice total: ${esc(gbp(inv.total))}</p><p>Paid: ${esc(gbp(inv.amount_paid))} | Credits: ${esc(gbp(inv.amount_credited))} | Outstanding: ${esc(gbp(inv.amount_due))}</p><p class="note">Generated from the isolated fictional BMS demonstration tenant. Verify all details before using any real business invoice.</p></body></html>`;
   return new Response(page,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
  }
  if(new URL(req.url).searchParams.get("format")==="csv"){
   const headers=["Invoice number","Status","Gross GBP","Paid GBP","Credited GBP","Outstanding GBP","Due date","Source quotation"];
   const values=invoiceRows.map((x:any)=>[x.invoice_number,x.status,x.total,x.amount_paid,x.amount_credited,x.amount_due,x.due_date||"",x.source_quote_id||""]);
   const csv=[headers,...values].map(row=>row.map(safeCsvCell).join(",")).join("\r\n")+"\r\n";
   return new Response(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=\"bms-invoices-"+job+".csv\"","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }
  const googleStatus=await centralRest("business_software_integrations?tenant_id=eq."+tenant+"&provider=eq.google&status=eq.connected&select=id&limit=1",{cache:"no-store"});const googleRows=googleStatus.ok?await json(googleStatus):[];const gmailConnected=Array.isArray(googleRows)&&googleRows.length>0;
  return NextResponse.json({
   fictional:true,tenant:"flooring-showcase-demo",job_id:job,
   quotes,invoices:invoiceRows,allocations,credits,
   unlinked_invoice_count:invoiceRows.filter((x:any)=>!x.source_quote_valid).length,
   summary:{
    latest_quote_net:quotes.length?Number(quotes[0].amount||0):null,
    latest_quote_vat_rate:quotes.length?Number(quotes[0].vat_rate||0):null,
    latest_quote_totals:quotes.length?quoteTotals(quotes[0].amount,quotes[0].vat_rate):null,
    ...balances,
    draft_count:invoiceRows.filter((x:any)=>x.status==="draft").length,
    overdue_total:invoiceRows.filter((x:any)=>x.overdue).reduce((sum:number,x:any)=>sum+Number(x.amount_due||0),0),
    aging:agingBuckets(invoiceRows,new Date().toISOString().slice(0,10)),
   },
   gmail_connected:gmailConnected,
   gmail_test_recipient_configured:Boolean(String(process.env.BMS_DEMO_EMAIL_ALLOWLIST||"").trim()),
   accounting_provider_connected:false,
   external_sync_permitted:false
  },{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 }catch(e){return response(e instanceof Error?e.message:"Unable to inspect fictional accounting",409)}
}

export async function POST(req:Request){
 try{
  // Cookie-authenticated mutations must originate from this application.
  const origin=req.headers.get("origin");
  const host=new URL(req.url).host.toLowerCase();
  if(!origin)return response("Request origin required for cookie-authenticated demo writes",403);
  let source:URL;
  try{source=new URL(origin)}catch{return response("Invalid request origin",403)}
  if(source.host.toLowerCase()!==host||source.protocol!=="https:")return response("Cross-site demo mutations are blocked",403);
  const tenant=await demoTenant();
  const actor=await memberAllowed(tenant);
  if(!actor)return response("Authenticated BMS manager required for fictional demo",403);
  const d=await req.json().catch(()=>null);
  if(!d||typeof d!=="object")return response("Invalid request",400);
  const action=String(d.action||""),keyValue=String(d.request_key||"");
  if(!requestKey.test(keyValue))return response("A stable unique request key is required",400);
  let result:unknown;
  const num=(v:unknown)=>{const n=Number(v);if(!Number.isFinite(n)||n<=0||n>100000)return NaN;return n};
  const amount=(v:unknown)=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>10000000)return NaN;return n};
  if(action==="draft_financial_email"||action==="send_financial_email"){
   const job=String(d.job_id||""),documentId=String(d.document_id||""),kind=String(d.kind||""),to=String(d.recipient||"").trim().toLowerCase();
   if(!uuid.test(job)||!uuid.test(documentId)||!["quote","invoice"].includes(kind))return response("Select a fictional quotation or invoice",400);
   await owned("business_software_jobs",tenant,job);
   const table=kind==="quote"?"business_software_quotes":"business_software_invoices";
   const doc=await owned(table,tenant,documentId,kind==="quote"?"id,job_id,version,status,amount,vat_rate,scope_text":"id,job_id,invoice_number,status,total,amount_paid,amount_credited,amount_due,source_quote_id,provider");
   if(doc.job_id!==job||(kind==="invoice"&&doc.provider!=="internal"))return response("Financial document does not belong to selected fictional job",403);
   if(kind==="quote"&&doc.status!=="approved")return response("Approve the quotation before preparing email",409);
   if(kind==="invoice"&&!["issued","part_paid","paid","settled"].includes(doc.status))return response("Issue the invoice before preparing email",409);
   if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to))return response("Valid test recipient required",400);
   const allowlist=String(process.env.BMS_DEMO_EMAIL_ALLOWLIST||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
   if(!allowlist.includes(to))return response("Recipient is not an authorised fictional-tenant test address",403);
   const send=action==="send_financial_email",mode=send?"send":"draft";
   const reserved=await centralRest("business_software_financial_email_attempts",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({tenant_id:tenant,request_key:keyValue,job_id:job,document_id:documentId,kind,recipient:to,mode,status:"reserved"})});
   if(!reserved.ok){if(reserved.status===409)return response("Email request key already used. Check the prior result before retrying.",409);return response("Unable to reserve email request",503)}
   const attempt=(await json(reserved))?.[0];if(!attempt?.id)throw Error("Email reservation not confirmed");
   try{
    const quote=kind==="quote"?doc:doc.source_quote_id?await owned("business_software_quotes",tenant,String(doc.source_quote_id),"id,amount,vat_rate,scope_text"):null;
    const net=quote?Number(quote.amount):null,vat=quote?quoteTotals(quote.amount,quote.vat_rate):null;
    const total=kind==="quote"?Number(vat?.gross):Number(doc.total);
    if(!Number.isFinite(total)||total<0)throw Error("Invalid financial document amount");
    const ref=kind==="quote"?"FLOOR-Q"+doc.version+"-"+documentId.slice(0,8):String(doc.invoice_number);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {pdfDocument}=require("@/business-software-core/lib/financial-pdf.cjs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {gmailFinancial}=require("@/business-software-core/lib/fictional-gmail-finance.cjs");
    const settings=await centralRest("business_software_tenant_settings?tenant_id=eq."+tenant+"&select=accent_colour&limit=1",{cache:"no-store"});
    if(!settings.ok)throw Error("Unable to load tenant branding");
    const settingsRow=(await json(settings))?.[0];
    const pdf=pdfDocument({title:kind==="quote"?"Quotation":"Invoice",issuer:"Oak & Stone Flooring Demo",brandColor:settingsRow?.accent_colour||"#263c54",reference:ref,recipient:"Fictional Flooring customer",items:[String(quote?.scope_text||"Fictional flooring works"),...(net===null?[]:["Net: GBP "+net.toFixed(2),"VAT ("+Number(quote.vat_rate)+"%): GBP "+Number(vat?.vat).toFixed(2)]),"Total: GBP "+total.toFixed(2),...(kind==="invoice"?["Paid: GBP "+Number(doc.amount_paid||0).toFixed(2),"Credited: GBP "+Number(doc.amount_credited||0).toFixed(2),"Outstanding: GBP "+Number(doc.amount_due||0).toFixed(2)]:[])],footer:"Fictional demonstration. Not valid for commercial use."});
    const mail=await gmailFinancial({tenant,to,subject:"Fictional Flooring "+(kind==="quote"?"quotation ":"invoice ")+ref,body:"Fictional BMS acceptance test only. Please find the demonstration document attached.",filename:ref+".pdf",pdf,send,centralRest,env:process.env});
    const updated=await centralRest("business_software_financial_email_attempts?id=eq."+attempt.id+"&tenant_id=eq."+tenant,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status:send?"sent":"drafted",provider_message_id:mail.gmail_id,updated_at:new Date().toISOString()})});
    if(!updated.ok)throw Error("Gmail accepted the message but the audit update failed. Do not retry without checking Gmail.");
    return NextResponse.json({ok:true,fictional:true,action,delivery:mail},{headers:{"Cache-Control":"private, no-store"}});
   }catch(err){
    await centralRest("business_software_financial_email_attempts?id=eq."+attempt.id+"&tenant_id=eq."+tenant+"&status=eq.reserved",{method:"PATCH",body:JSON.stringify({status:"failed",updated_at:new Date().toISOString()})}).catch(()=>{});
    throw err;
   }
  }else if(action==="reset_demo"){
   if(d.confirm_phrase!=="RESET OAK AND STONE DEMO")return response("Type the exact reset confirmation",400);
   result=await rpc("bms_reset_flooring_showcase",{p_confirm:"RESET OAK AND STONE DEMO"});
  }else if(action==="create_customer"){
   const first=String(d.first_name||"").trim(),last=String(d.last_name||"").trim(),email=String(d.email||"").trim();
   if(!first||!last||first.length>100||last.length>100||email.length>200)return response("Enter a valid customer name",400);
   result=await rpc("bms_create_customer_once",{p_tenant:tenant,p_first:first,p_last:last,p_email:email,p_key:keyValue});
  }else if(action==="edit_customer"){
   const id=String(d.customer_id||"");await owned("business_software_customers",tenant,id);
   const first=String(d.first_name||"").trim(),last=String(d.last_name||"").trim();
   if(!first||!last||first.length>100||last.length>100)return response("Enter a valid customer name",400);
   const r=await centralRest("business_software_customers?tenant_id=eq."+tenant+"&id=eq."+id,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({first_name:first,last_name:last})});
   if(!r.ok)throw Error("Customer update failed");result=(await json(r))?.[0];
  }else if(action==="create_enquiry"){
   const customer=String(d.customer_id||"");await owned("business_software_customers",tenant,customer);
   const area=num(d.area_m2),title=String(d.title||"New flooring enquiry").trim();
   if(!Number.isFinite(area)||title.length<3||title.length>160)return response("Valid enquiry area and title required",400);
   result=await rpc("bms_create_enquiry_once",{p_tenant:tenant,p_customer:customer,p_title:title,p_area_m2:area,p_key:keyValue});
  }else if(action==="create_quote"){
   const job=String(d.job_id||"");await owned("business_software_jobs",tenant,job);
   const total=amount(d.amount);if(!Number.isFinite(total)||total===0)return response("Quote amount must be positive",400);
   const scope=String(d.scope_text||"").trim();if(!scope||scope.length>2000)return response("Enter a valid quote scope",400);
   const leadTime=String(d.lead_time||"7-10 working days").trim();if(!leadTime||leadTime.length>200)return response("Enter a valid quotation lead time",400);
   const vatRate=d.vat_rate==null?20:Number(d.vat_rate);
   if(!Number.isFinite(vatRate)||vatRate<0||vatRate>100||Math.abs(vatRate*100-Math.round(vatRate*100))>0.000001)return response("VAT rate must be between 0 and 100 with at most two decimal places",400);
   quoteTotals(total,vatRate);
   result=await rpc("bms_create_quote_revision_once",{p_tenant:tenant,p_job:job,p_scope:scope,p_amount:total,p_vat_rate:vatRate,p_lead_time:leadTime,p_key:keyValue,p_actor:actor});
  }else if(action==="approve_quote"){
   const job=String(d.job_id||""),quoteId=String(d.quote_id||"");
   await owned("business_software_jobs",tenant,job);
   const selected=await owned("business_software_quotes",tenant,quoteId,"id,job_id,version,status,amount,vat_rate");
   if(selected.job_id!==job)return response("Quotation does not belong to the selected job",403);
   quoteTotals(selected.amount,selected.vat_rate);
   result=await rpc("bms_approve_quote_once",{p_tenant:tenant,p_job:job,p_quote:quoteId,p_actor:actor,p_key:keyValue});
  }else if(action==="create_sales_order"||action==="create_purchase_order"){
   const product=String(d.product_id||""),job=String(d.job_id||"");
   await owned("business_software_price_book_items",tenant,product);
   const jobRow=job?await owned("business_software_jobs",tenant,job,"id,customer_id"):null;
   const qty=num(d.quantity);if(!Number.isFinite(qty))return response("Invalid quantity",400);
   if(action==="create_sales_order"){
    const areaValue=d.area_m2==null?null:num(d.area_m2),wastage=Number(d.wastage_percent??10);
    if((areaValue!==null&&!Number.isFinite(areaValue))||!Number.isFinite(wastage)||wastage<0||wastage>100)return response("Invalid flooring area or wastage percentage",400);
    const customer=String(d.customer_id||"");await owned("business_software_customers",tenant,customer);
    if(jobRow&&jobRow.customer_id!==customer)return response("Sales order customer must match selected job",400);
    result=await rpc("bms_create_sales_order_once",{p_tenant:tenant,p_customer:customer,p_job:job||null,p_lines:[{product_id:product,quantity:qty,...(d.area_m2!=null?{area_m2:areaValue,wastage_percent:wastage}:{})}],p_reference:String(d.reference||"DEMO-"+keyValue).slice(0,100),p_key:keyValue});
   }else{
    const supplier=String(d.supplier_id||"");await owned("business_software_suppliers",tenant,supplier);
    const cost=amount(d.unit_cost_net);if(!Number.isFinite(cost))return response("Invalid unit cost",400);
    result=await rpc("bms_create_purchase_order_once",{p_tenant:tenant,p_supplier:supplier,p_job:job||null,p_lines:[{product_id:product,quantity:qty,unit_cost_net:cost}],p_notes:"Fictional flooring demo purchase",p_key:keyValue});
   }
  }else if(action==="plan_delivery"){
   const order=String(d.sales_order_id||"");await owned("business_software_sales_orders",tenant,order);
   const address=String(d.delivery_address||"").trim();if(address.length<5||address.length>300)return response("Enter a valid delivery address",400);
   result=await rpc("bms_plan_delivery_once",{p_tenant:tenant,p_sales_order:order,p_address:address,p_key:keyValue});
  }else if(["receive","reserve","pick","deliver","return"].includes(action)){
   if(action==="deliver"){
    const delivery=String(d.delivery_id||"");await owned("business_software_deliveries",tenant,delivery);
    result=await rpc("bms_confirm_delivery",{p_tenant:tenant,p_delivery:delivery,p_key:keyValue,p_notes:"Confirmed fictional demo delivery"});
   }else{
    const location=String(d.location_id||"");await owned("business_software_stock_locations",tenant,location);
    const qty=num(d.quantity);if(!Number.isFinite(qty))return response("Invalid stock quantity",400);
    if(action==="return"){
     const product=String(d.product_id||"");await owned("business_software_price_book_items",tenant,product);
     const deliveries=await centralRest("business_software_deliveries?tenant_id=eq."+tenant+"&status=eq.delivered&select=id&limit=1");
     if(!(await json(deliveries))?.length)return response("Confirm a fictional delivery before accepting unused material",409);
     const picked=await centralRest("business_software_sales_order_lines?tenant_id=eq."+tenant+"&product_id=eq."+product+"&select=picked_quantity&limit=100");
     const pickedTotal=((await json(picked))||[]).reduce((n:number,x:any)=>n+Number(x.picked_quantity||0),0);
     const returned=await centralRest("business_software_stock_movements?tenant_id=eq."+tenant+"&product_id=eq."+product+"&source_type=eq.fitting_return&select=quantity_delta&limit=1000");
     if(!returned.ok)throw Error("Unable to verify previous returns");
     const returnedTotal=((await json(returned))||[]).reduce((n:number,x:any)=>n+Number(x.quantity_delta||0),0);
     if(qty+returnedTotal>pickedTotal)return response("Cumulative returns cannot exceed picked stock",409);
     result=await rpc("bms_apply_stock_movement",{p_tenant:tenant,p_product:product,p_location:location,p_delta:qty,p_reason:"Fictional unused materials returned",p_source_type:"fitting_return",p_source_id:"flooring-showcase",p_key:keyValue});
    }else{
     const line=String(d.line_id||"");
     await owned(action==="receive"?"business_software_purchase_order_lines":"business_software_sales_order_lines",tenant,line);
     result=action==="receive"?await rpc("bms_receive_purchase_line",{p_tenant:tenant,p_line:line,p_location:location,p_qty:qty,p_receipt_key:keyValue}):action==="reserve"?await rpc("bms_reserve_sales_order_line",{p_tenant:tenant,p_line:line,p_location:location,p_qty:qty,p_key:keyValue}):await rpc("bms_pick_sales_order_line",{p_tenant:tenant,p_line:line,p_location:location,p_qty:qty,p_key:keyValue});
    }
   }
  }else if(action==="issue_invoice_credit"){
   const job=String(d.job_id||""),invoice=String(d.invoice_id||"");
   await owned("business_software_jobs",tenant,job);
   const row=await owned("business_software_invoices",tenant,invoice,"id,job_id,provider,status");
   if(row.job_id!==job||row.provider!=="internal")return response("Internal invoice must belong to selected job",403);
   const creditAmount=amount(d.amount),reason=String(d.reason||"").trim();
   if(!Number.isFinite(creditAmount)||creditAmount<=0||Math.abs(creditAmount*100-Math.round(creditAmount*100))>0.000001||reason.length<3||reason.length>500)return response("Valid credit amount and reason required",400);
   result=await rpc("bms_issue_internal_invoice_credit_once",{p_tenant:tenant,p_job:job,p_invoice:invoice,p_amount:creditAmount,p_reason:reason,p_key:keyValue,p_actor:actor});
  }else if(action==="record_invoice_payment"){
   const job=String(d.job_id||""),invoice=String(d.invoice_id||"");
   await owned("business_software_jobs",tenant,job);
   const row=await owned("business_software_invoices",tenant,invoice,"id,job_id,provider,status");
   if(row.job_id!==job||row.provider!=="internal")return response("Internal invoice must belong to selected job",403);
   const paymentAmount=amount(d.amount),method=String(d.payment_method||"").trim(),paidAt=String(d.paid_at||"");
   if(!Number.isFinite(paymentAmount)||paymentAmount<=0||Math.abs(paymentAmount*100-Math.round(paymentAmount*100))>0.000001||method.length<2||method.length>80||!paidAt||!Number.isFinite(Date.parse(paidAt)))return response("Valid payment amount, method and date required",400);
   result=await rpc("bms_record_internal_invoice_payment_once",{p_tenant:tenant,p_job:job,p_invoice:invoice,p_amount:paymentAmount,p_method:method,p_paid_at:paidAt,p_key:keyValue,p_actor:actor});
  }else if(action==="issue_invoice"||action==="void_invoice"){
   const job=String(d.job_id||""),invoice=String(d.invoice_id||"");
   await owned("business_software_jobs",tenant,job);
   const row=await owned("business_software_invoices",tenant,invoice,"id,job_id,provider,status");
   if(row.job_id!==job||row.provider!=="internal")return response("Internal invoice must belong to the selected job",403);
   const dueDate=String(d.due_date||"");
   if(action==="issue_invoice"&&!/^\d{4}-\d{2}-\d{2}$/.test(dueDate))return response("Valid invoice due date required",400);
   result=await rpc("bms_transition_internal_invoice_once",{p_tenant:tenant,p_job:job,p_invoice:invoice,p_action:action==="issue_invoice"?"issue":"void",p_actor:actor,p_key:keyValue,p_due_date:action==="issue_invoice"?dueDate:null});
  }else if(action==="create_draft_invoice"){
   const job=String(d.job_id||"");await owned("business_software_jobs",tenant,job);
   const latestQuote=await centralRest("business_software_quotes?tenant_id=eq."+tenant+"&job_id=eq."+job+"&select=id,amount,vat_rate,status&order=version.desc&limit=1",{cache:"no-store"});
   if(!latestQuote.ok)throw Error("Unable to verify latest quotation");
   const quote=(await json(latestQuote))?.[0];if(!quote)return response("Create a quotation before drafting an invoice",409);
   if(quote.status!=="approved")return response("Approve the latest quotation before converting it to an invoice",409);
   quoteTotals(quote.amount,quote.vat_rate);
   const settings=await centralRest("business_software_tenant_settings?tenant_id=eq."+tenant+"&select=invoice_prefix&limit=1");if(!settings.ok)throw Error("Unable to load tenant invoice numbering settings");const invoicePrefix=String((await json(settings))?.[0]?.invoice_prefix||"INV").trim();if(!/^[A-Za-z0-9-]{2,12}$/.test(invoicePrefix))throw Error("Invalid tenant invoice prefix");
   result=await rpc("bms_create_internal_draft_invoice_once",{p_tenant:tenant,p_job:job,p_quote:String(quote.id),p_key:"quote:"+String(quote.id),p_invoice_prefix:invoicePrefix});

  }else return response("Unsupported demo action",400);
  return NextResponse.json({ok:true,action,result,fictional:true,tenant:"flooring-showcase-demo",accounting_provider_connected:false},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return response(e instanceof Error?e.message:"Demo action failed",409)}
}
