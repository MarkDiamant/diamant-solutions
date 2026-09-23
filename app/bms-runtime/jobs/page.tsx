import BusinessDirectory from "@/components/admin/BusinessDirectory";
function DemoPage(){return <BusinessDirectory view="jobs"/>;}

export default function Page(){return process.env.BMS_STAGING_PREVIEW==="true"?<BusinessDirectory view="jobs" staging/>:<DemoPage/>;}
