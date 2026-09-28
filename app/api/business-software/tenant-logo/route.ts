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
    const image=await fetch(src,{cache:"no-store",headers:{"User-Agent":"Diamant-BMS/1.0"}});
    if(!image.ok)return new NextResponse(null,{status:502});
    const type=image.headers.get("content-type")||"image/png";
    if(!type.startsWith("image/"))return new NextResponse(null,{status:415});
    return new NextResponse(await image.arrayBuffer(),{headers:{"Content-Type":type,"Cache-Control":"private, max-age=300","Access-Control-Allow-Origin":"*"}});
  }catch{return new NextResponse(null,{status:500});}
}