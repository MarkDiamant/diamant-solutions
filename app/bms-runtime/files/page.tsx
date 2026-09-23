import BusinessDirectory from "@/components/admin/BusinessDirectory";
function DemoPage(){return <BusinessDirectory view="files"/>;}

export default function Page(){return process.env.BMS_STAGING_PREVIEW==="true"?<BusinessDirectory view="files" staging/>:<DemoPage/>;}
