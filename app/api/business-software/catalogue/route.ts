import {NextResponse} from "next/server";
import {runtimeTenant} from "@/lib/business-software/runtime";
import {centralRest} from "@/lib/business-software/db";
export const dynamic="force-dynamic";
export async function GET(){
 const tenant=await runtimeTenant();
 if(!tenant?.id)return NextResponse.json({error:"Catalogue unavailable"},{status:404});
 const id=encodeURIComponent(tenant.id);
 const [productsResponse,stockResponse]=await Promise.all([
  centralRest("business_software_price_book_items?tenant_id=eq."+id+"&active=eq.true&show_on_website=eq.true&select=id,sku,name,customer_product_name,description,category,subcategory,specifications,image_urls,variants,stock_controlled,selling_unit&order=name.asc&limit=1000"),
  centralRest("business_software_stock_balances?tenant_id=eq."+id+"&select=product_id,on_hand,reserved&limit=5000")
 ]);
 if(!productsResponse.ok||!stockResponse.ok)return NextResponse.json({error:"Catalogue temporarily unavailable"},{status:503});
 const products=await productsResponse.json(),balances=await stockResponse.json();
 const available=new Map<string,number>();
 for(const row of balances){const id=String(row.product_id);available.set(id,(available.get(id)||0)+Math.max(0,Number(row.on_hand)-Number(row.reserved)));}
 return NextResponse.json({business:tenant.business_name,products:products.map((p:any)=>({
  id:p.id,sku:p.sku,name:p.customer_product_name||p.name,description:p.description,category:p.category,subcategory:p.subcategory,specifications:p.specifications,
  images:p.image_urls,variants:p.variants,unit:p.selling_unit,
  availability:p.stock_controlled?(available.get(String(p.id))||0)>0?"in_stock":"out_of_stock":"not_stock_controlled"
 }))},{headers:{"Cache-Control":"public, max-age=60","X-Content-Type-Options":"nosniff"}});
}
