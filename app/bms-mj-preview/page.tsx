import {headers} from "next/headers";
import {tenantRecord} from "../../lib/business-software/db";
import LoginClient from "./LoginClient";

export default async function TenantLoginPage(){
 const h=await headers();
 const host=(h.get("x-bms-tenant-host")||h.get("x-forwarded-host")||h.get("host")||"").split(":")[0].toLowerCase();
 const tenant=await tenantRecord(null,host);
 return <LoginClient tenantName={tenant?.business_name||"Business"} />;
}
