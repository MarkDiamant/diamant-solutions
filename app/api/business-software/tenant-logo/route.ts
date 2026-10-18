import { NextResponse } from "next/server";
import { runtimeTenant } from "@/lib/business-software/runtime";
import { centralRest } from "@/lib/business-software/db";

export async function GET(){
  try{
    const tenant=await runtimeTenant();
    if(!tenant?.id)return new NextResponse(null,{status:404});
    const r=await centralRest("business_software_tenant_settings?tenant_id=eq."+encodeURIComponent(tenant.id)+"&select=logo_url,app_config&limit=1",{cache:"no-store"});
    if(!r.ok)return new NextResponse(null,{status:404});
    const row=(await r.json().catch(()=>[]))[0];
    const src=String(row?.logo_url||row?.app_config?.logoUrl||"").trim();
    if(!src)return new NextResponse(null,{status:404});
    const url=new URL(src);const allowed=new Set(["mjmetal.co.uk","www.mjmetal.co.uk","iepqggrfenfqrqyzqyed.supabase.co",...(process.env.BMS_LOGO_ALLOWED_HOSTS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)]);if(url.protocol!=="https:"||!allowed.has(url.hostname.toLowerCase())||url.username||url.password)return new NextResponse(null,{status:415});const image=await fetch(url,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(8000),headers:{"User-Agent":"Diamant-BMS/1.0"}});
    if(!image.ok)return new NextResponse(null,{status:502});
    const type=image.headers.get("content-type")||"image/png";
    if(!["image/png","image/jpeg","image/webp","image/gif"].includes(type.split(";")[0].trim().toLowerCase()))return new NextResponse(null,{status:415});
    const bytes=await image.arrayBuffer();if(bytes.byteLength>2_000_000)return new NextResponse(null,{status:413});return new NextResponse(bytes,{headers:{"Content-Type":type,"Cache-Control":"private, max-age=300","Access-Control-Allow-Origin":"*"}});
  }catch{return new NextResponse(null,{status:500});}
}