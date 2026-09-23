import BusinessDirectory from "@/components/admin/BusinessDirectory";
import {runtimeTenant} from "@/lib/business-software/runtime";
export const dynamic="force-dynamic";
export default async function Page(){const tenant=await runtimeTenant();return <BusinessDirectory view="customers" staging={tenant?.slug==="mjmetal"}/>;}
