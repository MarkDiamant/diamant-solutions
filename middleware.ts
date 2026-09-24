import {NextRequest,NextResponse} from "next/server";

const DEMO_HOST="bms.diamantsolutions.co.uk";
const MJ_HOST="mjmetal.diamantsolutions.co.uk";
function hostname(value:string|null|undefined){return String(value||"").trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0].split(":")[0];}

export function middleware(request:NextRequest){
 const requestHost=hostname(request.nextUrl.hostname),hostHeader=hostname(request.headers.get("host")),forwardedHost=hostname(request.headers.get("x-forwarded-host"));
 const hosts=[requestHost,hostHeader,forwardedHost],host=hosts.includes(MJ_HOST)?MJ_HOST:hosts.includes(DEMO_HOST)?DEMO_HOST:requestHost,path=request.nextUrl.pathname;
 if(host===MJ_HOST){
   if(path.startsWith("/api/admin/")){const url=request.nextUrl.clone();url.pathname="/api/bms-live"+path.slice("/api/admin".length);return NextResponse.rewrite(url);}\n   if(path==="/login"||path==="/admin/login"){const url=request.nextUrl.clone();url.pathname="/bms-mj-preview";return NextResponse.rewrite(url);}
   if(!path.startsWith("/api/")&&!path.startsWith("/_next/")&&!path.includes(".")){
     const hasSession=Boolean(request.cookies.get("sb-access-token")?.value||request.cookies.get("sb-auth-token")?.value||request.cookies.get("bms_authenticated")?.value);
     if(!hasSession){const url=request.nextUrl.clone();url.pathname="/login";return NextResponse.redirect(url);}
     const url=request.nextUrl.clone();url.pathname=path==="/"?"/bms-runtime":`/bms-runtime${path}`;return NextResponse.rewrite(url);
   }
   return NextResponse.next();
 }
 const demoDeployment=process.env.BMS_DEMO_ONLY==="true",isDemo=demoDeployment||host===DEMO_HOST;
 if(isDemo&&path.startsWith("/api/")&&!path.startsWith("/api/bms-demo/")&&path!=="/api/bms-demo")return NextResponse.json({error:"Production actions are unavailable in the fictional demo."},{status:403,headers:{"Cache-Control":"no-store"}});
 if(host===DEMO_HOST&&!path.startsWith("/api/")&&!path.startsWith("/_next/")&&!path.includes(".")){const url=request.nextUrl.clone();url.pathname=path==="/"?"/bms-runtime":`/bms-runtime${path}`;return NextResponse.rewrite(url);}
 return NextResponse.next();
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|images/).*)"]};
