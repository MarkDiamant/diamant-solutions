import {NextRequest,NextResponse} from "next/server";

const DEMO_HOST="bms.diamantsolutions.co.uk";
function hostname(value:string|null|undefined){return String(value||"").trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0].split(":")[0];}

export async function middleware(request:NextRequest){
 const requestHost=hostname(request.nextUrl.hostname),hostHeader=hostname(request.headers.get("host")),forwardedHost=hostname(request.headers.get("x-forwarded-host"));
 const host=requestHost||hostHeader,path=request.nextUrl.pathname; // Never allow a caller-supplied forwarded host to override the actual routed tenant.
 if(host==="sites.diamantsolutions.co.uk"){return NextResponse.redirect(new URL("https://diamantsolutions.co.uk/websites#work"),308);}
 const tenantHost=host.endsWith(".diamantsolutions.co.uk")&&host!==DEMO_HOST&&host!=="www.diamantsolutions.co.uk";
 if(tenantHost&&path.startsWith("/bms-runtime/")){const url=request.nextUrl.clone();url.pathname=path.slice("/bms-runtime".length);return NextResponse.redirect(url,308);}
 if(tenantHost&&path==="/admin"){const url=request.nextUrl.clone();url.pathname="/";return NextResponse.redirect(url,308);}
 if(tenantHost&&path.startsWith("/admin/")){const url=request.nextUrl.clone();url.pathname=path.slice(6);return NextResponse.redirect(url,308);}
 if(tenantHost){
   if(path==="/favicon.ico"){const url=request.nextUrl.clone();url.pathname="/api/business-software/icon";const headers=new Headers(request.headers);headers.set("x-bms-tenant-host",host);return NextResponse.rewrite(url,{request:{headers}});}
   if(path==="/manifest.webmanifest"){const url=request.nextUrl.clone();url.pathname="/api/business-software/manifest";return NextResponse.rewrite(url);}
   if(path.startsWith("/api/bms-demo"))return NextResponse.json({error:"Demo API is disabled on live BMS tenants."},{status:404});
   // Workers cannot use any other tenant API, including direct endpoints outside the admin router.
   if(path.startsWith("/api/")&&!path.startsWith("/api/admin/auth/")&&path!=="/api/admin/session"&&!path.startsWith("/api/admin/worker/")&&request.cookies.get("bms_access_token")?.value){
     let role:string|null=null;
     try{const r=await fetch(new URL("/api/admin/session",request.url),{headers:{cookie:request.headers.get("cookie")||""},cache:"no-store"});if(r.ok){const x=await r.json();role=String(x?.admin?.role||"").toLowerCase();}}catch{}
     if(role==="worker")return NextResponse.json({error:"Worker access is limited to My Jobs"},{status:403});
   }
   if(path.startsWith("/api/admin/")){const url=request.nextUrl.clone();url.pathname="/api/bms-live/"+path.slice("/api/admin/".length);const headers=new Headers(request.headers);headers.set("x-bms-tenant-host",host);return NextResponse.rewrite(url,{request:{headers}});}
   if(path==="/api/jobs"||path.startsWith("/api/jobs/")){const url=request.nextUrl.clone();url.pathname="/api/bms-live/jobs"+path.slice("/api/jobs".length);const headers=new Headers(request.headers);headers.set("x-bms-tenant-host",host);return NextResponse.rewrite(url,{request:{headers}});}
   if(path.startsWith("/api/integrations/")){const url=request.nextUrl.clone();url.pathname="/api/bms-live/integrations/"+path.slice("/api/integrations/".length);const headers=new Headers(request.headers);headers.set("x-bms-tenant-host",host);return NextResponse.rewrite(url,{request:{headers}});}
   if(path==="/login"){const url=request.nextUrl.clone();url.pathname="/bms-mj-preview";return NextResponse.rewrite(url);}
   if(!path.startsWith("/api/")&&!path.startsWith("/_next/")&&!path.includes(".")){
     const hasSession=Boolean(request.cookies.get("bms_access_token")?.value||request.cookies.get("bms_refresh_token")?.value);
     if(!hasSession){const url=request.nextUrl.clone();url.pathname="/login";return NextResponse.redirect(url);}
     // Verify the server-issued membership on every tenant page request. A worker may only open My Jobs.
     const sessionUrl=new URL("/api/admin/session",request.url);
     let sessionResponse:Response;
     try{sessionResponse=await fetch(sessionUrl,{headers:{cookie:request.headers.get("cookie")||""},cache:"no-store"});}catch{return NextResponse.json({error:"Session verification unavailable"},{status:503});}
     if(!sessionResponse.ok){const url=request.nextUrl.clone();url.pathname="/login";return NextResponse.redirect(url);}
     const session=await sessionResponse.json().catch(()=>null);
     if(!session?.admin?.role){return NextResponse.json({error:"Membership verification unavailable"},{status:503});}
     if(String(session.admin.role).toLowerCase()==="worker"&&path!=="/worker"){const url=request.nextUrl.clone();url.pathname="/worker";return NextResponse.redirect(url);}
     const url=request.nextUrl.clone();const clean=path;url.pathname=clean==="/"?"/bms-runtime":`/bms-runtime${clean}`;return NextResponse.rewrite(url);
   }
   return NextResponse.next();
 }
 const demoDeployment=process.env.BMS_DEMO_ONLY==="true",isDemo=demoDeployment||host===DEMO_HOST;
 const demoKeys=new Set(["northstar","electrical","insurance","studio","consultancy","distribution","flooring"]);
 const demoParts=path.split("/").filter(Boolean),pathSample=demoKeys.has(demoParts[0]||"")?demoParts[0]:null;
 const demoCleanPath=pathSample?"/"+demoParts.slice(1).join("/"):path;
 if(isDemo&&(path==="/favicon.ico"||path==="/api/business-software/icon")){const url=request.nextUrl.clone();url.pathname="/Icon-512.png";return NextResponse.rewrite(url);}
 const cookieSample=request.cookies.get("bms_demo_sample")?.value;const demoSample=pathSample||(cookieSample&&demoKeys.has(cookieSample)?cookieSample:null)||request.nextUrl.searchParams.get("sample")||request.headers.get("x-bms-demo-sample")||request.headers.get("referer")?.match(/\/(northstar|electrical|insurance|studio|consultancy|distribution|flooring)(?:\/|$)/)?.[1]||"northstar";
 // Demo shares the live dashboard API contract but must use fictional handlers only.
 if(isDemo&&path==="/api/business-software/campaigns"){const url=request.nextUrl.clone();url.pathname="/api/bms-demo/campaigns";const headers=new Headers(request.headers);headers.set("x-bms-demo-sample",demoSample);return NextResponse.rewrite(url,{request:{headers}});}
 if(isDemo&&path==="/api/bms-stock"){const url=request.nextUrl.clone();url.pathname="/api/bms-demo/stock";const headers=new Headers(request.headers);headers.set("x-bms-demo-sample",demoSample);return NextResponse.rewrite(url,{request:{headers}});}
 if(isDemo&&path.startsWith("/api/admin/")){const url=request.nextUrl.clone();url.pathname="/api/bms-demo/"+path.slice("/api/admin/".length);const headers=new Headers(request.headers);headers.set("x-bms-demo-sample",demoSample);return NextResponse.rewrite(url,{request:{headers}});}
 if(isDemo&&path==="/api/bms-live/payments/customer-ledger-summary"){const url=request.nextUrl.clone();url.pathname="/api/bms-demo/payments/customer-ledger-summary";const headers=new Headers(request.headers);headers.set("x-bms-demo-sample",demoSample);return NextResponse.rewrite(url,{request:{headers}});}
 if(isDemo&&path.startsWith("/api/jobs")){const url=request.nextUrl.clone();url.pathname="/api/bms-demo/jobs"+path.slice("/api/jobs".length);const headers=new Headers(request.headers);headers.set("x-bms-demo-sample",demoSample);return NextResponse.rewrite(url,{request:{headers}});}
 if(isDemo&&path==="/api/admin/settings"){const url=request.nextUrl.clone();url.pathname="/api/bms-demo/settings";const headers=new Headers(request.headers);headers.set("x-bms-demo-sample",demoSample);return NextResponse.rewrite(url,{request:{headers}});}
 if(isDemo&&path.startsWith("/api/")&&!path.startsWith("/api/bms-demo/")&&path!=="/api/bms-demo"&&path!=="/api/business-software/tenant-logo")return NextResponse.json({error:"Production actions are unavailable in the fictional demo."},{status:403,headers:{"Cache-Control":"no-store"}});
 if(host===DEMO_HOST&&!path.startsWith("/api/")&&!path.startsWith("/_next/")&&!path.includes(".")){if(!pathSample&&!path.startsWith("/bms-runtime")){const redirect=request.nextUrl.clone();redirect.pathname="/"+demoSample+(path==="/admin"?"":path.startsWith("/admin/")?path.slice(6):path==="/"? "":path);redirect.searchParams.set("sample",demoSample);return NextResponse.redirect(redirect,307)}const url=request.nextUrl.clone();const legacy=demoCleanPath==="/admin"?"/":demoCleanPath.startsWith("/admin/")?demoCleanPath.slice(6):demoCleanPath,clean=legacy.startsWith("/bms-runtime")?(legacy.slice("/bms-runtime".length)||"/"):legacy;url.pathname=clean==="/"?"/bms-runtime":`/bms-runtime${clean}`;url.searchParams.set("sample",demoSample);const response=NextResponse.rewrite(url);response.headers.set("Cache-Control","no-store, max-age=0");if(pathSample)response.cookies.set("bms_demo_sample",pathSample,{path:"/",sameSite:"lax",secure:true,httpOnly:true,maxAge:3600});return response;}
 return NextResponse.next();
}
export const config={matcher:["/((?!_next/static|_next/image|images/).*)"]};
