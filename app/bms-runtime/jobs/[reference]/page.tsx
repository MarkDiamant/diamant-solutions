import JobDetail from "@/components/admin/JobDetail";
import MjOperationalJob from "@/components/admin/MjOperationalJob";
export default async function JobPage({params}:{params:Promise<{reference:string}>}){
 const {reference}=await params,ref=reference.toUpperCase();
 return process.env.BMS_STAGING_PREVIEW==="true"?<MjOperationalJob reference={ref}/>:<JobDetail reference={ref}/>;
}
