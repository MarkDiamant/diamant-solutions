import {NextResponse} from "next/server";

export function middleware(request){
 const host=(request.headers.get("host")||"").split(":")[0].toLowerCase();
 if(host!=="bms.diamantsolutions.co.uk")return NextResponse.next();
 const path=request.nextUrl.pathname;
 if(path.startsWith("/_next/")||path.startsWith("/bms-runtime")||path.startsWith("/bms-demo")||path.startsWith("/api/bms-demo")||path.startsWith("/images/")||path.includes("."))return NextResponse.next();
 const url=request.nextUrl.clone();
 if(path==="/demo"){url.pathname="/bms-demo";return NextResponse.rewrite(url);}
 if(path==="/embed"){url.pathname="/bms-embed";return NextResponse.rewrite(url);}
 url.pathname="/bms-runtime"+(path==="/"?"" : path);
 return NextResponse.rewrite(url);
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
