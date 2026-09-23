import MjOperationalDirectory from "@/components/admin/MjOperationalDirectory";
import BusinessDirectory from "@/components/admin/BusinessDirectory";
function DemoPage(){return <BusinessDirectory view="quotes"/>;}

export default function Page(){return process.env.BMS_STAGING_PREVIEW==="true"?<MjOperationalDirectory view="quotes"/>:<DemoPage/>;}
