import {NextResponse} from "next/server";

export function middleware(request){
 const host=(request.headers.get("host")||"").split(":")[0].toLowerCase();
 if(host!=="bms.diamantsolutions.co.uk")return NextResponse.next();
 const path=request.nextUrl.pathname;
 if(path.startsWith("/_next/")||path.startsWith("/bms-demo")||path.startsWith("/images/")||path.includes("."))return NextResponse.next();
 const url=request.nextUrl.clone();url.pathname=path==="/embed"?"/bms-embed":"/bms-demo";url.search="";
 return NextResponse.rewrite(url);
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
