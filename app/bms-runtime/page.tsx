import CrmDashboardV5 from "@/components/admin/CrmDashboardV5";
import MjOperationalDashboard from "@/components/admin/MjOperationalDashboard";
export const dynamic="force-dynamic";
export default function BmsRuntimePage(){return process.env.BMS_STAGING_PREVIEW==="true"?<MjOperationalDashboard/>:<CrmDashboardV5/>;}
