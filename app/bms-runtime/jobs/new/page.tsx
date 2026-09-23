import NewJobFormV2 from "@/components/admin/NewJobFormV2";
import MjOperationalNewJob from "@/components/admin/MjOperationalNewJob";
import {runtimeTenant} from "@/lib/business-software/runtime";
export const dynamic="force-dynamic";
export default async function NewJobPage(){const tenant=await runtimeTenant();return tenant?.slug==="mjmetal"?<MjOperationalNewJob/>:<NewJobFormV2/>;}
