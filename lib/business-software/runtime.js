import {headers} from "next/headers";
import {tenantRecord} from "./db";
export async function runtimeTenant(){
 const h=await headers();
 const host=(h.get("x-bms-tenant-host")||h.get("x-forwarded-host")||h.get("host")||"").split(":")[0].toLowerCase();
 if(!host)return null;
 const tenant=await tenantRecord(null,host);
 if(tenant)return tenant;
 if(host==="mjmetal.diamantsolutions.co.uk")return {id:"3ebc2265-8842-4826-b464-71783d6cf841",slug:"mjmetal",business_name:"M&J Metal",canonical_host:host,status:"active"};
 return null;
}
