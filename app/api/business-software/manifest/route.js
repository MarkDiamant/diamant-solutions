import {NextResponse} from "next/server";
import {tenantRecord} from "../../../../lib/business-software/db";
function host(v=""){return String(v).trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0].split(":")[0]}
export async function GET(request){
 const h=host(request.headers.get("x-forwarded-host")||request.headers.get("host")||"");
 const t=await tenantRecord(null,h);
 const business=t?.business_name||(h==="mjmetal.diamantsolutions.co.uk"?"M&J Metal":"Your Business");
 const name=business+" BMS";
 const icon="/api/business-software/icon";
 return NextResponse.json({name,short_name:name,id:"/",
   start_url:"/",
   scope:"/",display:"standalone",background_color:"#ffffff",theme_color:"#e66a24",icons:[{src:icon+"?v=4",sizes:"any",purpose:"any"},{src:icon+"?v=4",sizes:"any",purpose:"maskable"}]},{headers:{"Content-Type":"application/manifest+json","Cache-Control":"no-store"}});
}