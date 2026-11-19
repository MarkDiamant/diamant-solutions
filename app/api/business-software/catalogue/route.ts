import {NextResponse} from "next/server";
import {runtimeTenant} from "@/lib/business-software/runtime";
import {centralRest} from "@/lib/business-software/db";
export const dynamic="force-dynamic";
// Specifications and variants also contain private supplier costs. Never spread them into public output.
const publicSpecs=["coverage_m2_per_pack","colour","color","finish","material","thickness_mm","width_mm","length_mm","wear_layer_mm","species","grade","installation_method","underfloor_heating","water_resistant","warranty_years"];
function text(x:unknown){return typeof x==="string"?x.slice(0,2000):null;}
function scalar(x:unknown){return typeof x==="string"?x.slice(0,500):typeof x==="boolean"?x:typeof x==="number"&&Number.isFinite(x)?x:undefined;}
function images(x:unknown){return Array.isArray(x)?x.filter((v:unknown)=>{if(typeof v!=="string")return false;try{return new URL(v).protocol==="https:"}catch{return false}}).slice(0,20):[];}
function specifications(x:any){const out:Record<string,unknown>={};if(x&&typeof x==="object"&&!Array.isArray(x))for(const k of publicSpecs){const value=scalar(x[k]);if(value!==undefined)out[k]=value;}return out;}
function variants(x:any){return Array.isArray(x)?x.slice(0,100).filter(v=>v&&typeof v==="object"&&!Array.isArray(v)).map(v=>({name:text(v.name),sku:text(v.sku),colour:text(v.colour||v.color),size:text(v.size),images:images(v.image_urls)})):[];}
export async function GET(request:Request){
 try{
 const tenant=await runtimeTenant();
 if(!tenant?.id||tenant.status!=="active")return NextResponse.json({error:"Catalogue unavailable"},{status:404,headers:{"Cache-Control":"no-store"}});
 const id=encodeURIComponent(tenant.id);
 const [productsResponse,stockResponse,settingsResponse]=await Promise.all([
  centralRest("business_software_price_book_items?tenant_id=eq."+id+"&active=eq.true&show_on_website=eq.true&select=id,sku,name,customer_product_name,description,category,subcategory,specifications,image_urls,variants,stock_controlled,selling_unit&order=name.asc&limit=1000"),
  centralRest("business_software_stock_balances?tenant_id=eq."+id+"&select=product_id,on_hand,reserved&limit=5000"),
  centralRest("business_software_tenant_settings?tenant_id=eq."+id+"&select=website&limit=1")
 ]);
 if(!productsResponse.ok||!stockResponse.ok||!settingsResponse.ok)throw Error("Catalogue data unavailable");
 const products=await productsResponse.json(),balances=await stockResponse.json(),settings=await settingsResponse.json();
 if(!Array.isArray(products)||!Array.isArray(balances)||!Array.isArray(settings)||products.length>=1000||balances.length>=5000||settings.length>1)throw Error("Incomplete catalogue");
 const available=new Map<string,number>();
 for(const row of balances){if(row.on_hand===null||row.reserved===null||row.on_hand===""||row.reserved===""||!Number.isFinite(Number(row.on_hand))||!Number.isFinite(Number(row.reserved)))throw Error("Stock unavailable");const product=String(row.product_id);available.set(product,(available.get(product)||0)+Number(row.on_hand)-Number(row.reserved));}
 const headers:Record<string,string>={"Cache-Control":"public, max-age=60","X-Content-Type-Options":"nosniff","Vary":"Origin"};
 const website=String(settings[0]?.website||"").trim(),incoming=request.headers.get("origin");try{if(website&&incoming){const allowed=new URL(/^https?:\/\//i.test(website)?website:"https://"+website),actual=new URL(incoming);if(allowed.protocol==="https:"&&actual.protocol==="https:"&&allowed.origin===actual.origin)headers["Access-Control-Allow-Origin"]=actual.origin;}}catch{}
 return NextResponse.json({business:tenant.business_name,products:products.map((p:any)=>({
  id:p.id,sku:text(p.sku),name:text(p.customer_product_name)||text(p.name),description:text(p.description),category:text(p.category),subcategory:text(p.subcategory),specifications:specifications(p.specifications),
  images:images(p.image_urls),variants:variants(p.variants),unit:text(p.selling_unit),
  availability:p.stock_controlled?(available.get(String(p.id))||0)>0?"in_stock":"out_of_stock":"not_stock_controlled"
 }))},{headers});
 }catch{return NextResponse.json({error:"Catalogue temporarily unavailable"},{status:503,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
}
