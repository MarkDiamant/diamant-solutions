import {headers} from "next/headers";
import {tenantRecord} from "./db";
export async function runtimeTenant(){
 const h=await headers();
 const host=(h.get("host")||"").split(":")[0].toLowerCase();
 if(!host)return null;
 return tenantRecord(null,host);
}
