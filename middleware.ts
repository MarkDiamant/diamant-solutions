import {NextRequest,NextResponse} from "next/server";

/** Server-side isolation for the public fictional BMS demo.
 * Client-side fetch rewriting is a convenience, never a security boundary.
 * Do not allow the demo hostname to invoke production APIs or OAuth callbacks.
 */
export function middleware(request:NextRequest){
  const hostname=(request.headers.get("x-forwarded-host")||request.headers.get("host")||"").split(":")[0].toLowerCase();
  if(hostname!=="bms.diamantsolutions.co.uk")return NextResponse.next();
  const path=request.nextUrl.pathname;
  if(path.startsWith("/api/")&&!path.startsWith("/api/bms-demo/")&&path!=="/api/bms-demo"){
    return NextResponse.json({error:"Production actions are unavailable in the fictional demo."},{status:403,headers:{"Cache-Control":"no-store"}});
  }
  return NextResponse.next();
}
export const config={matcher:["/api/:path*"]};
