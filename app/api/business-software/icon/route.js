import {NextResponse} from "next/server";
import {tenantRecord,publicTenantSettings} from "../../../../lib/business-software/db";
function host(v=""){return String(v).trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0].split(":")[0]}
function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;")}
export async function GET(request){
 const h=host(request.headers.get("x-bms-tenant-host")||request.headers.get("x-forwarded-host")||request.headers.get("host")||"");
 const t=await tenantRecord(null,h);
 if(!t)return new NextResponse(null,{status:404});
 const settings=t.slug?await publicTenantSettings(t.slug):null;
 const src=settings?.logo_url||null;
 let imageData="";
 if(src){
  if(src.startsWith("data:image/"))imageData=src;
  else {
   const r=await fetch(src,{cache:"no-store"}).catch(()=>null);
   if(r?.ok){const type=r.headers.get("content-type")||"image/png";imageData="data:"+type+";base64,"+Buffer.from(await r.arrayBuffer()).toString("base64");}
  }
 }
 const fallback="https://diamantsolutions.co.uk/Icon-512.png";
 if(!imageData){const r=await fetch(fallback,{cache:"no-store"}).catch(()=>null);if(r?.ok)imageData="data:"+(r.headers.get("content-type")||"image/png")+";base64,"+Buffer.from(await r.arrayBuffer()).toString("base64");}
 if(!imageData)return new NextResponse(null,{status:404});
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="white"/><image href="'+esc(imageData)+'" x="72" y="72" width="368" height="368" preserveAspectRatio="xMidYMid meet"/></svg>';
 return new NextResponse(svg,{headers:{"Content-Type":"image/svg+xml; charset=utf-8","Cache-Control":"no-store"}});
}
