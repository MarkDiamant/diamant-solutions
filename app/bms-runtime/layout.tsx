import type {Metadata} from "next";
import "./bms.css";
import AdminBrandBar from "@/components/admin/AdminBrandBar";
import AdminPrimaryNav from "@/components/admin/AdminPrimaryNav";
import DiamantCredit from "@/components/admin/DiamantCredit";
import BmsRuntimeGuard from "@/components/BmsRuntimeGuard";
import {runtimeTenant} from "@/lib/business-software/runtime";
export const metadata:Metadata={title:"Business Management Software | Diamant Solutions",robots:{index:false,follow:false,nocache:true}};
export const dynamic="force-dynamic";
export default async function BmsRuntimeLayout({children}:{children:React.ReactNode}){
 const tenant=await runtimeTenant(),live=Boolean(tenant);
 return <div className="bms-shell">{!live&&<BmsRuntimeGuard/>}{!live&&<div className="bg-[#17385f] px-4 py-2 text-center text-xs font-black text-white print:hidden">DEMO MODE · Fictional data · External actions are disabled · Changes reset automatically</div>}<AdminBrandBar/><AdminPrimaryNav/>{children}<footer className="bms-footer print:hidden"><DiamantCredit dark/></footer></div>;
}