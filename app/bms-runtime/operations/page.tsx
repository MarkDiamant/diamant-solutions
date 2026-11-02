import OperationsPanel from "@/business-software-core/components/admin/OperationsPanel";
import DemoOperationsPanel from "@/business-software-core/components/admin/DemoOperationsPanel";
import SalesOrders from "@/app/bms-sales-orders/page";
import {runtimeTenant} from "@/lib/business-software/runtime";
export default async function Page(){const tenant=await runtimeTenant();return tenant?<><SalesOrders/><details className="mx-auto max-w-6xl px-5 pb-8 print:hidden"><summary className="cursor-pointer text-sm font-semibold text-slate-600">Existing specialist operations (retained until workflows are verified)</summary><OperationsPanel/></details></>:<DemoOperationsPanel/>;}
