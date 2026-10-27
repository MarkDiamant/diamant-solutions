import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {runtimeTenant} from "@/lib/business-software/runtime";
import {centralRest} from "@/lib/business-software/db";
import crypto from "crypto";

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
async function memberAllowed(){
 const current=await runtimeTenant();if(!current?.id)return false;
 const jar=await cookies();const token=jar.get("bms_access_token")?.value;
 if(!token)return false;
 const user=await fetch(url+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token},cache:"no-store"});
 if(!user.ok)return false;
 const r=await fetch(url+"/rest/v1/rpc/bms_login_membership",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({p_tenant:current.id}),cache:"no-store"});
 if(!r.ok)return false;
 const m=await json(r);return !!m&&["owner","admin","manager"].includes(String(m.role));
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
export async function POST(req:Request){
 try{
  if(!await memberAllowed())return response("Authorised BMS manager session required",403);
  const tenant=await demoTenant(),d=await req.json().catch(()=>null);
  if(!d||typeof d!=="object")return response("Invalid request",400);
  const action=String(d.action||""),keyValue=String(d.request_key||"");
  if(!requestKey.test(keyValue))return response("A stable unique request key is required",400);
  let result:unknown;
  const num=(v:unknown)=>{const n=Number(v);if(!Number.isFinite(n)||n<=0||n>100000)return NaN;return n};
  const amount=(v:unknown)=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>10000000)return NaN;return n};
  if(action==="create_customer"){
   const first=String(d.first_name||"").trim(),last=String(d.last_name||"").trim(),email=String(d.email||"").trim();
   if(!first||!last||first.length>100||last.length>100||email.length>200)return response("Enter a valid customer name",400);
   const r=await centralRest("business_software_customers",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({tenant_id:tenant,first_name:first,last_name:last,email:email||null,notes:"Fictional flooring showcase customer"})});
   if(!r.ok)throw Error("Customer creation failed");result=(await json(r))?.[0];
  }else if(action==="edit_customer"){
   const id=String(d.customer_id||"");await owned("business_software_customers",tenant,id);
   const first=String(d.first_name||"").trim(),last=String(d.last_name||"").trim();
   if(!first||!last||first.length>100||last.length>100)return response("Enter a valid customer name",400);
   const r=await centralRest("business_software_customers?tenant_id=eq."+tenant+"&id=eq."+id,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({first_name:first,last_name:last})});
   if(!r.ok)throw Error("Customer update failed");result=(await json(r))?.[0];
  }else if(action==="create_quote"){
   const job=String(d.job_id||"");await owned("business_software_jobs",tenant,job);
   const total=amount(d.amount);if(!Number.isFinite(total)||total===0)return response("Quote amount must be positive",400);
   const scope=String(d.scope_text||"").trim();if(!scope||scope.length>2000)return response("Enter a valid quote scope",400);
   const r=await centralRest("business_software_quotes?tenant_id=eq."+tenant+"&job_id=eq."+job+"&select=version&order=version.desc&limit=1");
   if(!r.ok)throw Error("Unable to read quote versions");
   const version=Number((await json(r))?.[0]?.version||0)+1;
   const saved=await centralRest("business_software_quotes",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({tenant_id:tenant,job_id:job,version,status:"draft",scope_text:scope,amount:total,vat_rate:20,lead_time:"7-10 working days",created_by:"Demo manager"})});
   if(!saved.ok)throw Error("Quote creation failed");result=(await json(saved))?.[0];
  }else if(action==="create_sales_order"||action==="create_purchase_order"){
   const product=String(d.product_id||""),job=String(d.job_id||"");
   await owned("business_software_price_book_items",tenant,product);
   if(job)await owned("business_software_jobs",tenant,job);
   const qty=num(d.quantity);if(!Number.isFinite(qty))return response("Invalid quantity",400);
   if(action==="create_sales_order"){
    const customer=String(d.customer_id||"");await owned("business_software_customers",tenant,customer);
    result=await rpc("bms_create_sales_order_once",{p_tenant:tenant,p_customer:customer,p_job:job||null,p_lines:[{product_id:product,quantity:qty,...(d.area_m2!=null?{area_m2:num(d.area_m2),wastage_percent:Number(d.wastage_percent??10)}:{})}],p_reference:String(d.reference||"DEMO-"+keyValue).slice(0,100),p_key:keyValue});
   }else{
    const supplier=String(d.supplier_id||"");await owned("business_software_suppliers",tenant,supplier);
    const cost=amount(d.unit_cost_net);if(!Number.isFinite(cost))return response("Invalid unit cost",400);
    result=await rpc("bms_create_purchase_order_once",{p_tenant:tenant,p_supplier:supplier,p_job:job||null,p_lines:[{product_id:product,quantity:qty,unit_cost_net:cost}],p_notes:"Fictional flooring demo purchase",p_key:keyValue});
   }
  }else if(["receive","reserve","pick","deliver","return"].includes(action)){
   if(action==="deliver"){
    const delivery=String(d.delivery_id||"");await owned("business_software_deliveries",tenant,delivery);
    result=await rpc("bms_confirm_delivery",{p_tenant:tenant,p_delivery:delivery,p_key:keyValue,p_notes:"Confirmed fictional demo delivery"});
   }else{
    const location=String(d.location_id||"");await owned("business_software_stock_locations",tenant,location);
    const qty=num(d.quantity);if(!Number.isFinite(qty))return response("Invalid stock quantity",400);
    if(action==="return"){
     const product=String(d.product_id||"");await owned("business_software_price_book_items",tenant,product);
     result=await rpc("bms_apply_stock_movement",{p_tenant:tenant,p_product:product,p_location:location,p_delta:qty,p_reason:"Fictional unused materials returned",p_source_type:"fitting_return",p_source_id:"flooring-showcase",p_key:keyValue});
    }else{
     const line=String(d.line_id||"");
     await owned(action==="receive"?"business_software_purchase_order_lines":"business_software_sales_order_lines",tenant,line);
     result=action==="receive"?await rpc("bms_receive_purchase_line",{p_tenant:tenant,p_line:line,p_location:location,p_qty:qty,p_receipt_key:keyValue}):action==="reserve"?await rpc("bms_reserve_sales_order_line",{p_tenant:tenant,p_line:line,p_location:location,p_qty:qty,p_key:keyValue}):await rpc("bms_pick_sales_order_line",{p_tenant:tenant,p_line:line,p_location:location,p_qty:qty,p_key:keyValue});
    }
   }
  }else if(action==="create_draft_invoice"){
   const job=String(d.job_id||"");await owned("business_software_jobs",tenant,job);
   const total=amount(d.total);if(!Number.isFinite(total)||total===0)return response("Invoice total must be positive",400);
   const invoiceNumber="FLI-"+crypto.createHash("sha256").update(tenant+":"+keyValue).digest("hex").slice(0,16).toUpperCase();
   const existing=await centralRest("business_software_invoices?tenant_id=eq."+tenant+"&invoice_number=eq."+invoiceNumber+"&select=id,invoice_number&limit=1");
   const previous=(await json(existing))?.[0];
   if(previous)result=previous;
   else{
    const saved=await centralRest("business_software_invoices",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({tenant_id:tenant,job_id:job,provider:"internal",invoice_number:invoiceNumber,status:"draft",total,amount_due:total,amount_paid:0,currency_code:"GBP",created_by:"Demo manager"})});
    if(!saved.ok)throw Error("Draft invoice creation failed");result=(await json(saved))?.[0];
   }
  }else return response("Unsupported demo action",400);
  return NextResponse.json({ok:true,action,result,fictional:true,tenant:"flooring-showcase-demo",accounting_provider_connected:false},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return response(e instanceof Error?e.message:"Demo action failed",409)}
}
