import MjOperationalDirectory from "@/components/admin/MjOperationalDirectory";
import BusinessDirectory from "@/components/admin/BusinessDirectory";
function DemoPage(){return <BusinessDirectory view="invoices"/>;}

export default function Page(){return process.env.BMS_STAGING_PREVIEW==="true"?<MjOperationalDirectory view="invoices"/>:<DemoPage/>;}
