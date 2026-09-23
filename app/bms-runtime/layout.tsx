import type {Metadata} from "next";
import "./bms.css";
import AdminBrandBar from "@/components/admin/AdminBrandBar";
import AdminPrimaryNav from "@/components/admin/AdminPrimaryNav";
import DiamantCredit from "@/components/admin/DiamantCredit";
import BmsRuntimeGuard from "@/components/BmsRuntimeGuard";
export const metadata:Metadata={title:"Business Management Software | Diamant Solutions",robots:{index:false,follow:false,nocache:true}};
export default function BmsRuntimeLayout({children}:{children:React.ReactNode}){
 const staging=process.env.BMS_STAGING_PREVIEW==="true"&&process.env.DS_SUPABASE_URL==="https://sfxeyydkwzlduflpmidd.supabase.co";
 if(staging)return <div className="bms-shell"><div className="bg-[#17385f] px-4 py-2 text-center text-xs font-black text-white print:hidden">M&J ISOLATED STAGING · Not live · Changes do not affect production</div>{children}<footer className="bms-footer print:hidden"><DiamantCredit dark/></footer></div>;
 return <div className="bms-shell"><BmsRuntimeGuard/><div className="bg-[#17385f] px-4 py-2 text-center text-xs font-black text-white print:hidden">DEMO MODE · Fictional data · External actions are disabled · Changes reset automatically</div><AdminBrandBar/><AdminPrimaryNav/>{children}<footer className="bms-footer print:hidden"><DiamantCredit dark/></footer></div>;
}
