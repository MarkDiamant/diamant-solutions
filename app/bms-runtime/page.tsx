import CrmDashboardV5 from "@/components/admin/CrmDashboardV5";
import MjOperationalDashboard from "@/components/admin/MjOperationalDashboard";
import {runtimeTenant} from "@/lib/business-software/runtime";
export const dynamic="force-dynamic";
export default async function BmsRuntimePage(){const tenant=await runtimeTenant();return tenant?.slug==="mjmetal"?<MjOperationalDashboard/>:<CrmDashboardV5/>;}
