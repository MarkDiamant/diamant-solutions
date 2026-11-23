import MaterialsPage from "@/app/bms-materials/page";
import {runtimeTenant} from "@/lib/business-software/runtime";
export const dynamic="force-dynamic";
export default async function BmsMaterialsRoute(){const tenant=await runtimeTenant();return <MaterialsPage demoReadOnly={!tenant}/>;}
