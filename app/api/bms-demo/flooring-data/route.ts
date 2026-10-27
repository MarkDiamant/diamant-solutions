import {NextResponse} from "next/server";
import {centralRest} from "@/lib/business-software/db";
export const dynamic="force-dynamic";
/* Read-only, fictional showcase tenant. Never accepts tenant IDs or writes from clients. */
export async function GET(){
 try{
 const tenantResponse=await centralRest("business_software_tenants?slug=eq.flooring-showcase-demo&select=id,business_name&limit=1");
 if(!tenantResponse.ok)return NextResponse.json({error:"Showcase unavailable"},{status:503});
 const tenant=(await tenantResponse.json())[0];
 if(!tenant)return NextResponse.json({error:"Showcase not provisioned"},{status:404});
 const id=encodeURIComponent(tenant.id);
 const endpoints={
 products:"business_software_price_book_items?tenant_id=eq."+id+"&active=eq.true&select=id,name,sku,category,unit,units_per_pack,specifications,fixed_sell_net,cost_net,show_on_website&order=name.asc&limit=100",
 locations:"business_software_stock_locations?tenant_id=eq."+id+"&select=id,name&limit=100",
 jobs:"business_software_jobs?tenant_id=eq."+id+"&select=id,reference,customer_id,agreed_amount&limit=100",
 stock:"business_software_stock_balances?tenant_id=eq."+id+"&select=product_id,on_hand,reserved&limit=100",
 customers:"business_software_customers?tenant_id=eq."+id+"&select=id,first_name,last_name&limit=100",
 suppliers:"business_software_suppliers?tenant_id=eq."+id+"&select=id,name&limit=100",
 sales:"business_software_sales_orders?tenant_id=eq."+id+"&select=id,reference,status&limit=100",
 sales_lines:"business_software_sales_order_lines?tenant_id=eq."+id+"&select=id,sales_order_id,product_id,quantity,agreed_unit_net,reserved_quantity,picked_quantity&limit=100",
 purchase:"business_software_material_orders?tenant_id=eq."+id+"&select=id,status,amount&limit=100",
 purchase_lines:"business_software_purchase_order_lines?tenant_id=eq."+id+"&select=id,material_order_id,product_id,ordered_quantity,received_quantity&limit=100",
 quotes:"business_software_quotes?tenant_id=eq."+id+"&select=version,status,amount,lead_time&limit=100",
 deliveries:"business_software_deliveries?tenant_id=eq."+id+"&select=id,status,delivery_address&limit=100",
 invoices:"business_software_invoices?tenant_id=eq."+id+"&provider=eq.internal&select=invoice_number,status,total,amount_due,amount_paid&limit=100"
 };
 const results=await Promise.all(Object.values(endpoints).map(path=>centralRest(path)));
 if(results.some(r=>!r.ok)){const failed=await Promise.all(results.map(async(r,i)=>!r.ok?{source:Object.keys(endpoints)[i],status:r.status,detail:String((await r.json().catch(()=>({})))?.message||"").slice(0,160)}:null));return NextResponse.json({error:"Showcase data unavailable",failed_sources:failed.filter(Boolean)},{status:503});}
 const data=await Promise.all(results.map(r=>r.json()));
 return NextResponse.json({business:tenant.business_name,fictional:true,read_only:true,connected:true,...Object.fromEntries(Object.keys(endpoints).map((key,i)=>[key,data[i]]))},{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return NextResponse.json({error:"Showcase temporarily unavailable"},{status:503});}
}
