import {NextResponse} from "next/server";
import {centralRest} from "@/lib/business-software/db";
export const dynamic="force-dynamic";
export async function GET(){
 try{
 const t=await centralRest("business_software_tenants?slug=eq.flooring-showcase-demo&select=id&limit=1");
 if(!t.ok)return NextResponse.json({error:"Demo unavailable"},{status:503});
 const tenant=(await t.json())[0];if(!tenant)return NextResponse.json({error:"Demo not provisioned"},{status:404});
 const id=encodeURIComponent(tenant.id);
 const paths={
 orders:"business_software_sales_orders?tenant_id=eq."+id+"&select=*&order=created_at.desc&limit=200",
 lines:"business_software_sales_order_lines?tenant_id=eq."+id+"&select=*&limit=2000",
 deliveries:"business_software_deliveries?tenant_id=eq."+id+"&select=*&limit=200",
 deliveryLines:"business_software_delivery_lines?tenant_id=eq."+id+"&select=*&limit=2000",
 customers:"business_software_customers?tenant_id=eq."+id+"&select=id,first_name,last_name&limit=200",
 products:"business_software_price_book_items?tenant_id=eq."+id+"&select=id,name,sku,unit,units_per_pack&limit=200",
 locations:"business_software_stock_locations?tenant_id=eq."+id+"&select=id,name&limit=100",
 jobs:"business_software_jobs?tenant_id=eq."+id+"&select=id,reference,job_title&limit=200",
 balances:"business_software_stock_balances?tenant_id=eq."+id+"&select=product_id,on_hand,reserved&limit=500",
 returns:"business_software_customer_returns?tenant_id=eq."+id+"&select=id,sales_order_id,sales_order_line_id,quantity,reason,created_at&limit=200"
 };
 const entries=await Promise.all(Object.entries(paths).map(async([key,path])=>{const r=await centralRest(path);if(!r.ok)throw Error("Demo data unavailable: "+key);return [key,await r.json()]}));
 return NextResponse.json({...Object.fromEntries(entries),showValues:false,demo:true},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Unable to load fictional demo orders"},{status:503});}
}
export async function POST(){return NextResponse.json({error:"Fictional demo is read-only without an authorised test account"},{status:403});}
