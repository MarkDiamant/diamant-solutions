import { NextResponse } from "next/server";
import { runtimeTenant } from "@/lib/business-software/runtime";
import { centralRest } from "@/lib/business-software/db";

export async function GET(){
  try{
    const tenant=await runtimeTenant();
    if(!tenant?.id)return new NextResponse(null,{status:404});
    const r=await centralRest("business_software_tenant_settings?tenant_id=eq."+encodeURIComponent(tenant.id)+"&select=logo_url,app_config&limit=1",{cache:"no-store"});
    const row=r.ok?(await r.json().catch(()=>[]))[0]:null;
    const configured=String(row?.logo_url||row?.app_config?.logoUrl||"").trim();
    const fallback=["mjmetal","mj-metal"].includes(String(tenant.slug||""))?"https://mjmetal.co.uk/images/logo.png":"";
    const sources=[configured,fallback].filter(Boolean);
    const allowed=new Set(["mjmetal.co.uk","www.mjmetal.co.uk","iepqggrfenfqrqyzqyed.supabase.co",...(process.env.BMS_LOGO_ALLOWED_HOSTS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)]);
    for(const src of sources){
      try{
        const url=new URL(src);
        if(url.protocol!=="https:"||!allowed.has(url.hostname.toLowerCase())||url.username||url.password)continue;
        const image=await fetch(url,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(8000),headers:{"User-Agent":"Diamant-BMS/1.0"}});
        if(!image.ok)continue;
        const type=(image.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
        if(!["image/png","image/jpeg","image/webp","image/gif"].includes(type))continue;
        const bytes=await image.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>2_000_000)continue;
        return new NextResponse(bytes,{headers:{"Content-Type":type,"Cache-Control":"private, max-age=60","X-Content-Type-Options":"nosniff"}});
      }catch{continue;}
    }
    return new NextResponse(null,{status:404});
  }catch{return new NextResponse(null,{status:500});}
}