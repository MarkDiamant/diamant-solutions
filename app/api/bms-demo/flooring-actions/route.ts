import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {centralRest} from "@/lib/business-software/db";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {reconcile,quoteTotals}=require("@/business-software-core/lib/finance-reconcile.cjs");

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
 return Array.isArray(rows)&&rows.length>0;
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
  const job=new URL(req.url).searchParams.get("job_id")||"";
  if(!uuid.test(job))return response("Valid fictional job_id required",400);
  await owned("business_software_jobs",tenant,job);
  const q=await centralRest("business_software_quotes?tenant_id=eq."+tenant+"&job_id=eq."+job+"&select=id,version,status,amount,vat_rate,lead_time,created_at&order=version.desc&limit=100",{cache:"no-store"});
  const i=await centralRest("business_software_invoices?tenant_id=eq."+tenant+"&job_id=eq."+job+"&select=id,invoice_number,provider,status,total,amount_due,amount_paid,source_quote_id,created_at&order=created_at.desc&limit=100",{cache:"no-store"});
  if(!q.ok||!i.ok)throw Error("Unable to read fictional quote and invoice ledger");
  const quotes=await json(q),invoices=await json(i);
  if(!Array.isArray(quotes)||!Array.isArray(invoices))throw Error("Invalid fictional accounting ledger");
  const balances=reconcile(quotes,invoices);
  const quoteIds=new Set(quotes.map((x:any)=>x.id));
  const invoiceRows=invoices.map((x:any)=>({
   ...x,
   source_quote_valid:!!x.source_quote_id&&quoteIds.has(x.source_quote_id),
   external_sync: x.provider!=="internal",
  }));
  return NextResponse.json({
   fictional:true,tenant:"flooring-showcase-demo",job_id:job,
   quotes,invoices:invoiceRows,
   unlinked_invoice_count:invoiceRows.filter((x:any)=>!x.source_quote_valid).length,
   summary:{
    latest_quote_net:quotes.length?Number(quotes[0].amount||0):null,
    latest_quote_vat_rate:quotes.length?Number(quotes[0].vat_rate||0):null,
    latest_quote_totals:quotes.length?quoteTotals(quotes[0].amount,quotes[0].vat_rate):null,
    ...balances,
    draft_count:invoiceRows.filter((x:any)=>x.status==="draft").length,
   },
   accounting_provider_connected:false,
   external_sync_permitted:false
  },{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 }catch(e){return response(e instanceof Error?e.message:"Unable to inspect fictional accounting",409)}
}

export async function POST(req:Request){
 try{
  // Cookie-authenticated mutations must originate from this application.
  const origin=req.headers.get("origin");
  const host=(req.headers.get("x-forwarded-host")||req.headers.get("host")||new URL(req.url).host).toLowerCase();
  if(!origin)return response("Request origin required for cookie-authenticated demo writes",403);
  let source:URL;
  try{source=new URL(origin)}catch{return response("Invalid request origin",403)}
  if(source.host.toLowerCase()!==host||source.protocol!=="https:")return response("Cross-site demo mutations are blocked",403);
  const tenant=await demoTenant();
  if(!await memberAllowed(tenant))return response("Authenticated BMS manager required for fictional demo",403);
  const d=await req.json().catch(()=>null);
  if(!d||typeof d!=="object")return response("Invalid request",400);
  const action=String(d.action||""),keyValue=String(d.request_key||"");
  if(!requestKey.test(keyValue))return response("A stable unique request key is required",400);
  let result:unknown;
  const num=(v:unknown)=>{const n=Number(v);if(!Number.isFinite(n)||n<=0||n>100000)return NaN;return n};
  const amount=(v:unknown)=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>10000000)return NaN;return n};
  if(action==="reset_demo"){
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
   result=await rpc("bms_create_quote_revision_once",{p_tenant:tenant,p_job:job,p_scope:scope,p_amount:total,p_vat_rate:20,p_lead_time:leadTime,p_key:keyValue,p_actor:"Demo manager"});
  }else if(action==="approve_quote"){
   const job=String(d.job_id||""),quoteId=String(d.quote_id||"");
   await owned("business_software_jobs",tenant,job);
   const selected=await owned("business_software_quotes",tenant,quoteId,"id,job_id,version,status,amount,vat_rate");
   if(selected.job_id!==job)return response("Quotation does not belong to the selected job",403);
   const latest=await centralRest("business_software_quotes?tenant_id=eq."+tenant+"&job_id=eq."+job+"&select=id,version&order=version.desc&limit=1",{cache:"no-store"});
   if(!latest.ok)throw Error("Unable to verify latest quotation revision");
   if((await json(latest))?.[0]?.id!==quoteId)return response("Only the latest quotation revision can be approved",409);
   if(selected.status==="approved"){result=selected;}
   else{
    if(selected.status!=="draft")return response("Only draft quotations can be approved",409);
    quoteTotals(selected.amount,selected.vat_rate);
    const update=await centralRest("business_software_quotes?tenant_id=eq."+tenant+"&job_id=eq."+job+"&id=eq."+quoteId+"&status=eq.draft",{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status:"approved"})});
    if(!update.ok)throw Error("Quotation approval rejected");
    result=(await json(update))?.[0];
    if(!result)return response("Quotation was modified concurrently; reload before approving",409);
   }
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
