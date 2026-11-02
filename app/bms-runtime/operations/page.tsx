import SalesOrders from "@/app/bms-sales-orders/page";
import {runtimeTenant} from "@/lib/business-software/runtime";
import DemoOperationsPanel from "@/business-software-core/components/admin/DemoOperationsPanel";
export default async function Page(){const tenant=await runtimeTenant();return tenant?<SalesOrders/>:<DemoOperationsPanel/>;}
