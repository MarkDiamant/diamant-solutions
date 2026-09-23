import MjOperationalDirectory from "@/components/admin/MjOperationalDirectory";
import BusinessDirectory from "@/components/admin/BusinessDirectory";
function DemoPage(){return <BusinessDirectory view="payments"/>;}

export default function Page(){return process.env.BMS_STAGING_PREVIEW==="true"?<MjOperationalDirectory view="payments"/>:<DemoPage/>;}
