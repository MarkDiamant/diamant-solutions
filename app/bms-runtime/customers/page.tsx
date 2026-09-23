import MjOperationalDirectory from "@/components/admin/MjOperationalDirectory";
import BusinessDirectory from "@/components/admin/BusinessDirectory";
function DemoPage(){return <BusinessDirectory view="customers"/>;}

export default function Page(){return process.env.BMS_STAGING_PREVIEW==="true"?<MjOperationalDirectory view="customers"/>:<DemoPage/>;}
