import {NextResponse} from "next/server";

const CENTRAL_BMS_HOSTS=new Set(["bms.diamantsolutions.co.uk","mjmetal.diamantsolutions.co.uk"]);

export function middleware(request){
 const host=(request.headers.get("host")||"").split(":")[0].toLowerCase();
 if(!CENTRAL_BMS_HOSTS.has(host))return NextResponse.next();
 const path=request.nextUrl.pathname;
 if(path.startsWith("/_next/")||path.startsWith("/api/")||path.startsWith("/bms-runtime")||path.startsWith("/bms-demo")||path.startsWith("/bms-mj-preview")||path.startsWith("/images/")||path.includes("."))return NextResponse.next();
 const url=request.nextUrl.clone();
 if(host==="bms.diamantsolutions.co.uk"&&path==="/demo"){url.pathname="/bms-demo";return NextResponse.rewrite(url);}
 if(host==="bms.diamantsolutions.co.uk"&&path==="/embed"){url.pathname="/bms-embed";return NextResponse.rewrite(url);}
 if(host==="mjmetal.diamantsolutions.co.uk"&&path==="/login"){url.pathname="/bms-mj-preview";return NextResponse.rewrite(url);}
 url.pathname="/bms-runtime"+(path==="/"?"" : path);
 url.headers.set("x-bms-tenant-host",host);
 return NextResponse.rewrite(url);
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
