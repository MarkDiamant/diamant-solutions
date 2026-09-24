import {NextResponse} from "next/server";
function host(v=""){return String(v).trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0].split(":")[0]}
export async function GET(request){
 const h=host(request.headers.get("x-forwarded-host")||request.headers.get("host")||"");
 const src=h==="mjmetal.diamantsolutions.co.uk"?"https://mjmetal.co.uk/favicon.svg":"https://diamantsolutions.co.uk/Icon-512.png";
 const r=await fetch(src,{cache:"no-store"});if(!r.ok)return new NextResponse(null,{status:404});
 return new NextResponse(await r.arrayBuffer(),{headers:{"Content-Type":r.headers.get("content-type")||"image/png","Cache-Control":"no-store"}});
}