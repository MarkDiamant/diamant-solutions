import {NextResponse} from "next/server";
import {tenantRecord,publicTenantSettings} from "../../../../lib/business-software/db";
function host(v=""){return String(v).trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0].split(":")[0]}
export async function GET(request){
 const h=host(request.headers.get("x-forwarded-host")||request.headers.get("host")||"");
 const t=await tenantRecord(null,h);
 const settings=t?.slug?await publicTenantSettings(t.slug):null;
 let src=h==="mjmetal.diamantsolutions.co.uk"?"https://mjmetal.co.uk/favicon.svg":(settings?.app_icon_url||settings?.appIconUrl||settings?.logo_url||settings?.logoUrl||null);
 if(!src)src="https://diamantsolutions.co.uk/Icon-512.png";
 if(src.startsWith("data:image/")){const m=src.match(/^data:([^;]+);base64,(.+)$/);if(m)return new NextResponse(Buffer.from(m[2],"base64"),{headers:{"Content-Type":m[1],"Cache-Control":"no-store"}});}
 const r=await fetch(src,{cache:"no-store"});
 if(!r.ok)return new NextResponse(null,{status:404});
 return new NextResponse(await r.arrayBuffer(),{headers:{"Content-Type":r.headers.get("content-type")||"image/png","Cache-Control":"no-store"}});
}
