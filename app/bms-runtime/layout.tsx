import type {Metadata} from "next";
import "./bms.css";
import AdminBrandBar from "@/components/admin/AdminBrandBar";
import AdminPrimaryNav from "@/components/admin/AdminPrimaryNav";
import DiamantCredit from "@/components/admin/DiamantCredit";
import BmsRuntimeGuard from "@/components/BmsRuntimeGuard";
export const metadata:Metadata={title:"Business Management Software Demo | Diamant Solutions",description:"Interactive fictional demonstration of Diamant Solutions Business Management Software.",robots:{index:false,follow:false,nocache:true},alternates:{canonical:"https://bms.diamantsolutions.co.uk"}};
export default function BmsRuntimeLayout({children}:{children:React.ReactNode}){return <div className="bms-shell"><BmsRuntimeGuard/><div className="bg-[#17385f] px-4 py-2 text-center text-xs font-black text-white print:hidden">DEMO MODE · Fictional data · External actions are disabled · Changes reset automatically</div><AdminBrandBar/><AdminPrimaryNav/>{children}<footer className="border-t border-black/10 bg-white px-4 py-2 text-center text-black/40 print:hidden"><DiamantCredit/></footer></div>;}
