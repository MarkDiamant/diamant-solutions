import BusinessDirectory from "@/components/admin/BusinessDirectory";
function DemoPage(){return <BusinessDirectory view="invoices"/>;}

export default function Page(){return process.env.BMS_STAGING_PREVIEW==="true"?<BusinessDirectory view="invoices" staging/>:<DemoPage/>;}
