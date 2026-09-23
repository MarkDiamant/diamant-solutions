import {NextResponse} from "next/server";
import {requireTenantMember} from "../../../../lib/business-software/tenant-access";
import {centralRest} from "../../../../lib/business-software/db";
const TENANT="3ebc2265-8842-4826-b464-71783d6cf841";
export async function GET(request){
 const session=await requireTenantMember(request,TENANT,["owner","admin","manager","user"]);
 if(!session.ok)return NextResponse.json({error:session.error},{status:session.status});
 try{
 const r=await centralRest("business_software_integrations?tenant_id=eq."+TENANT+"&provider=eq.xero&select=status,provider_account,external_tenant_id,connected_at,token_expires_at&limit=1");
 if(!r.ok)return NextResponse.json({error:"Xero status unavailable"},{status:503});
 const row=(await r.json())[0];
 return NextResponse.json({connected:row?.status==="connected"&&row?.external_tenant_id==="63f524e9-78fd-4864-b273-9f504b0a6503",status:row?.status||"disconnected",organisation:row?.provider_account||null,connectedAt:row?.connected_at||null,tokenExpiresAt:row?.token_expires_at||null},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Xero status unavailable"},{status:503})}
}
