import {NextResponse} from "next/server";
import {tenantRecord} from "../../../../lib/business-software/db";
function host(v=""){return String(v).toLowerCase().split(":")[0]}
export async function POST(request){
 try{
  const {email,password}=await request.json();
  if(!email||!password)return NextResponse.json({error:"Email and password are required"},{status:400});
  const h=host(request.headers.get("x-forwarded-host")||request.headers.get("host")||"");
  const tenant=h==="mjmetal.diamantsolutions.co.uk"?{id:"3ebc2265-8842-4826-b464-71783d6cf841",slug:"mjmetal"}:await tenantRecord(null,h);
  if(!tenant)return NextResponse.json({error:"Business account unavailable"},{status:404});
  const url="https://iepqggrfenfqrqyzqyed.supabase.co",key="sb_publishable_ivTCLFGFroexc-3IHe25bg_qhzg_GIy";
  if(!url||!key)return NextResponse.json({error:"Authentication unavailable"},{status:503});
  const auth=await fetch(url+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({email,password}),cache:"no-store"});
  if(!auth.ok)return NextResponse.json({error:"Incorrect email or password"},{status:401});
  const session=await auth.json();
  const membership=await fetch(url+"/rest/v1/rpc/bms_login_membership",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},body:JSON.stringify({p_tenant:tenant.id}),cache:"no-store"});
  const member=membership.ok?await membership.json():null;
  if(!member)return NextResponse.json({error:"This account is not authorised for this business"},{status:403});
  const res=NextResponse.json({ok:true});
  const secure={httpOnly:true,secure:true,sameSite:"lax",path:"/"};
  res.cookies.set("bms_access_token",session.access_token,{...secure,maxAge:session.expires_in||3600});
  res.cookies.set("bms_refresh_token",session.refresh_token,{...secure,maxAge:60*60*24*30});
  res.cookies.set("bms_authenticated","1",{...secure,maxAge:60*60*24*30});
  return res;
 }catch{return NextResponse.json({error:"Unable to sign in"},{status:500})}
}