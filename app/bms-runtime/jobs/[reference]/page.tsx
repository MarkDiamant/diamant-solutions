import JobDetail from "@/components/admin/JobDetail";
export const dynamic="force-dynamic";
export default async function JobPage({params}:{params:Promise<{reference:string}>}){const {reference}=await params;return <JobDetail reference={reference.toUpperCase()}/>;}
