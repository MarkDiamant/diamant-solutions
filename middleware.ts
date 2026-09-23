import {NextRequest,NextResponse} from "next/server";

/**
 * Demo API isolation is enforced at the server edge. x-forwarded-host is
 * not trusted for authorisation: a caller can supply that header outside
 * the production proxy. Prefer the host of the request URL assigned by
 * Next/Vercel, and additionally deny when either observed host identifies
 * the public demo. A separate deployment-level demo-only mode is mandatory
 * for production because request headers alone are not an auth boundary.
 */
const DEMO_HOST="bms.diamantsolutions.co.uk";
function hostname(value:string|null|undefined){
  return String(value||"").trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0].split(":")[0];
}
export function middleware(request:NextRequest){
  const requestHost=hostname(request.nextUrl.hostname);
  const hostHeader=hostname(request.headers.get("host"));
  const forwardedHost=hostname(request.headers.get("x-forwarded-host"));
  const demoDeployment=process.env.BMS_DEMO_ONLY==="true";
  const isDemo=demoDeployment||[requestHost,hostHeader,forwardedHost].includes(DEMO_HOST);
  if(!isDemo)return NextResponse.next();
  const path=request.nextUrl.pathname;
  if(path.startsWith("/api/")&&!path.startsWith("/api/bms-demo/")&&path!=="/api/bms-demo"){
    return NextResponse.json(
      {error:"Production actions are unavailable in the fictional demo."},
      {status:403,headers:{"Cache-Control":"no-store"}}
    );
  }
  return NextResponse.next();
}
export const config={matcher:["/api/:path*"]};
