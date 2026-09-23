import JobDetail from "@/components/admin/JobDetail";
import MjOperationalJob from "@/components/admin/MjOperationalJob";
import {runtimeTenant} from "@/lib/business-software/runtime";
export const dynamic="force-dynamic";
export default async function JobPage({params}:{params:Promise<{reference:string}>}){const {reference}=await params,ref=reference.toUpperCase(),tenant=await runtimeTenant();return tenant?.slug==="mjmetal"?<MjOperationalJob reference={ref}/>:<JobDetail reference={ref}/>;}
