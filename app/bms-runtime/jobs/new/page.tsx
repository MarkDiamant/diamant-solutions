import NewJobFormV2 from "@/components/admin/NewJobFormV2";
import MjOperationalNewJob from "@/components/admin/MjOperationalNewJob";
export default function NewJobPage(){return process.env.BMS_STAGING_PREVIEW==="true"?<MjOperationalNewJob/>:<NewJobFormV2/>;}
