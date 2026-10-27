import {NextResponse} from "next/server";
import {centralRest} from "@/lib/business-software/db";
export const dynamic="force-dynamic";
/** Fictional showcase catalogue export. Only public list prices, never customer discounts or costs. */
export async function GET(){
 try{
  const tenantResponse=await centralRest("business_software_tenants?slug=eq.flooring-showcase-demo&canonical_host=eq.flooring-showcase.invalid&reference_tenant=eq.false&select=id,business_name&limit=1",{cache:"no-store"});
  if(!tenantResponse.ok)return NextResponse.json({error:"Catalogue unavailable"},{status:503});
  const tenant=(await tenantResponse.json().catch(()=>[]))?.[0];
  if(!tenant?.id)return NextResponse.json({error:"Fictional catalogue not provisioned"},{status:404});
  const r=await centralRest("business_software_price_book_items?tenant_id=eq."+encodeURIComponent(tenant.id)+"&active=eq.true&show_on_website=eq.true&select=sku,name,category,unit,units_per_pack,specifications,fixed_sell_net&order=name.asc&limit=100",{cache:"no-store"});
  if(!r.ok)return NextResponse.json({error:"Catalogue unavailable"},{status:503});
  const rows=await r.json().catch(()=>[]);
  if(!Array.isArray(rows))return NextResponse.json({error:"Catalogue unavailable"},{status:503});
  return NextResponse.json({schema_version:1,business:tenant.business_name,fictional:true,currency:"GBP",products:rows.map((p:any)=>({sku:p.sku,name:p.name,category:p.category,unit:p.unit,coverage_m2:Number(p.specifications?.coverage_m2_per_pack||p.units_per_pack||0),list_price_net:Number(p.fixed_sell_net||0)}))},{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return NextResponse.json({error:"Catalogue unavailable"},{status:503});}
}
