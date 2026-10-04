import TasksPanel from "@/components/admin/TasksPanel";
import {runtimeTenant} from "@/lib/business-software/runtime";
export const dynamic="force-dynamic";
export default async function TasksPage(){const tenant=await runtimeTenant();return <TasksPanel demo={!tenant}/>;}