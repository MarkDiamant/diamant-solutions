import {headers} from "next/headers";
export const MJ_TENANT_ID="3ebc2265-8842-4826-b464-71783d6cf841";
export async function runtimeTenant(){
 const h=await headers();
 const host=(h.get("x-bms-tenant-host")||h.get("host")||"").split(":")[0].toLowerCase();
 return host==="mjmetal.diamantsolutions.co.uk"?{id:MJ_TENANT_ID,slug:"mjmetal",host}:null;
}
