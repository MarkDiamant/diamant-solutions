import OperationsPanel from "@/business-software-core/components/admin/OperationsPanel";
import DemoOperationsPanel from "@/business-software-core/components/admin/DemoOperationsPanel";
import {runtimeTenant} from "@/lib/business-software/runtime";
export default async function Page(){const tenant=await runtimeTenant();return tenant?<OperationsPanel/>:<DemoOperationsPanel/>;}
