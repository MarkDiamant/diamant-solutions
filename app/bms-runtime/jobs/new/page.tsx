import NewJobFormV2 from "@/components/admin/NewJobFormV2";
import JobDetail from "@/components/admin/JobDetail";
export const dynamic="force-dynamic";
export default async function NewJobPage({searchParams}:{searchParams:Promise<{quick?:string}>}){
  const params=await searchParams;
  if(params?.quick==="1")return <NewJobFormV2/>;
  return <JobDetail reference="NEW"/>;
}
