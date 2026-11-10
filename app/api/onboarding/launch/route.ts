import {NextResponse} from "next/server";
import dns from "node:dns/promises";
const base=process.env.DS_SUPABASE_URL||process.env.SUPABASE_URL;
const key=process.env.DS_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const json=(body:any,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const headers=()=>({apikey:key,Authorization:"Bearer "+key});
export async function GET(req:Request){
 if(!base||!key)return json({error:"Setup unavailable"},503);
 if(process.env.BMS_TEST_ISOLATED==="true"&&(process.env.BMS_TEST_SUPABASE_PROJECT_REF!=="mhncjudrhevvbmsbvkta"||base!=="https://mhncjudrhevvbmsbvkta.supabase.co"))return json({error:"Isolated onboarding configuration mismatch"},503);
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/,"");
 if(!token)return json({error:"Sign in required"},401);
 const userResponse=await fetch(base+"/auth/v1/user",{headers:{...headers(),Authorization:"Bearer "+token},cache:"no-store"});
 if(!userResponse.ok)return json({error:"Session expired"},401);
 const user=await userResponse.json();
 const memberships=await fetch(base+"/rest/v1/tenant_members?user_id=eq."+encodeURIComponent(user.id)+"&role=eq.owner&select=tenant_id&limit=100",{headers:headers(),cache:"no-store"});
 if(!memberships.ok)return json({error:"Could not verify membership"},503);
 const ids=(await memberships.json()).map((x:any)=>x.tenant_id).filter((x:string)=>/^[0-9a-f-]{36}$/i.test(x));
 if(!ids.length)return json({ready:false});
 const requested=new URL(req.url).searchParams.get("tenantId");
 const tid=requested&&ids.includes(requested)?requested:null;
 if(!tid)return json({ready:false});
 const review=await fetch(base+"/rest/v1/business_software_onboarding_reviews?tenant_id=eq."+tid+"&approved_at=not.is.null&select=applied_bms_tenant_id&limit=1",{headers:headers(),cache:"no-store"});
 if(!review.ok)return json({error:"Could not verify approval"},503);
 const applied=(await review.json())[0]?.applied_bms_tenant_id;
 if(!applied)return json({ready:false});
 const tenant=await fetch(base+"/rest/v1/business_software_tenants?id=eq."+encodeURIComponent(applied)+"&status=eq.active&select=slug,canonical_host&limit=1",{headers:headers(),cache:"no-store"});
 if(!tenant.ok)return json({error:"Could not verify business access"},503);
 const business=(await tenant.json())[0];if(!business)return json({ready:false});
 const owner=await fetch(base+"/rest/v1/business_software_users?tenant_id=eq."+encodeURIComponent(applied)+"&auth_user_id=eq."+encodeURIComponent(user.id)+"&status=eq.active&select=id&limit=1",{headers:headers(),cache:"no-store"});
 if(!owner.ok)return json({error:"Could not verify user activation"},503);
 if(!(await owner.json()).length)return json({ready:false,error:"Your administrator access is awaiting activation"});
 const host=String(business.canonical_host||"");
 if(!/^[a-z0-9-]+\.diamantsolutions\.co\.uk$/i.test(host))return json({ready:false,error:"Business domain requires administrator review"});
 try{await dns.lookup(host)}catch{return json({ready:false,error:"Your business domain is being configured"})}
 return json({ready:true,url:"https://"+host+"/login",slug:business.slug});
}
