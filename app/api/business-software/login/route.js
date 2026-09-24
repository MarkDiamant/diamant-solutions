import {NextResponse} from "next/server";
import {tenantRecord,centralRest} from "../../../../lib/business-software/db";
function host(v=""){return String(v).toLowerCase().split(":")[0]}
export async function POST(request){
 try{
  const {email,password}=await request.json();
  if(!email||!password)return NextResponse.json({error:"Email and password are required"},{status:400});
  const h=host(request.headers.get("x-forwarded-host")||request.headers.get("host")||"");
  const tenant=await tenantRecord(h==="mjmetal.diamantsolutions.co.uk"?"mjmetal":null,h);
  if(!tenant)return NextResponse.json({error:"Business account unavailable"},{status:404});
  const url=process.env.DS_SUPABASE_URL,key=process.env.DS_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.json({error:"Authentication unavailable"},{status:503});
  const auth=await fetch(url+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({email,password}),cache:"no-store"});
  if(!auth.ok)return NextResponse.json({error:"Incorrect email or password"},{status:401});
  const session=await auth.json();
  const members=await centralRest("business_software_users?tenant_id=eq."+encodeURIComponent(tenant.id)+"&auth_user_id=eq."+encodeURIComponent(session.user.id)+"&status=eq.active&select=id&limit=1");
  const member=members.ok?(await members.json())[0]:null;
  if(!member)return NextResponse.json({error:"This account is not authorised for this business"},{status:403});
  const res=NextResponse.json({ok:true});
  const secure={httpOnly:true,secure:true,sameSite:"lax",path:"/"};
  res.cookies.set("bms_access_token",session.access_token,{...secure,maxAge:session.expires_in||3600});
  res.cookies.set("bms_refresh_token",session.refresh_token,{...secure,maxAge:60*60*24*30});
  res.cookies.set("bms_authenticated","1",{...secure,maxAge:60*60*24*30});
  return res;
 }catch{return NextResponse.json({error:"Unable to sign in"},{status:500})}
}