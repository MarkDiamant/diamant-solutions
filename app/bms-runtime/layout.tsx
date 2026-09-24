import {headers} from "next/headers";
import AdminBrandBar from "@/components/admin/AdminBrandBar";

export default async function BmsRuntimeLayout({children}:{children:React.ReactNode}){
 const h=await headers();
 const path=h.get("x-bms-original-path")||"";
 const login=path==="/login"||path==="/admin/login";
 return <>{!login&&<AdminBrandBar/>}{children}</>;
}
