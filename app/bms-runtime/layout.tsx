import type {Metadata} from "next";
import "./bms.css";
import AdminBrandBar from "@/components/admin/AdminBrandBar";
import AdminPrimaryNav from "@/components/admin/AdminPrimaryNav";
import DiamantCredit from "@/components/admin/DiamantCredit";
import BmsRuntimeGuard from "@/components/BmsRuntimeGuard";
import Link from "next/link";
export const metadata:Metadata={title:"Business Management Software | Diamant Solutions",robots:{index:false,follow:false,nocache:true}};
export default function BmsRuntimeLayout({children}:{children:React.ReactNode}){
 const staging=process.env.BMS_STAGING_PREVIEW==="true"&&process.env.DS_SUPABASE_URL==="https://sfxeyydkwzlduflpmidd.supabase.co";
 if(staging)return <div className="bms-shell"><div className="bg-[#17385f] px-4 py-2 text-center text-xs font-black text-white print:hidden">M&J ISOLATED STAGING · Not live · Changes do not affect production</div><header className="!sticky !top-0 !z-40 !flex !flex-wrap !items-center !justify-between !gap-3 !border-b !border-black/10 !bg-white !px-4 !py-3 print:hidden"><Link href="/bms-runtime" className="text-xl font-black tracking-tight text-[#172b4d]">M&J <span className="text-[#e66a24]">Management</span></Link><nav className="!flex !flex-wrap !gap-2 !bg-white text-sm font-bold">{[["Dashboard","/bms-runtime"],["Jobs","/bms-runtime/jobs"],["Customers","/bms-runtime/customers"],["Quotes","/bms-runtime/quotes"],["Invoices","/bms-runtime/invoices"],["Payments","/bms-runtime/payments"],["Files","/bms-runtime/files"],["Team","/bms-runtime/team"],["Integrations","/bms-runtime/integrations"]].map(([name,url])=><Link key={url} href={url} className="rounded-lg px-2 py-2 text-[#172b4d] hover:bg-[#fff0e4] hover:text-[#e66a24]">{name}</Link>)}</nav></header>{children}<footer className="bms-footer print:hidden"><DiamantCredit dark/></footer></div>;
 return <div className="bms-shell"><BmsRuntimeGuard/><div className="bg-[#17385f] px-4 py-2 text-center text-xs font-black text-white print:hidden">DEMO MODE · Fictional data · External actions are disabled · Changes reset automatically</div><AdminBrandBar/><AdminPrimaryNav/>{children}<footer className="bms-footer print:hidden"><DiamantCredit dark/></footer></div>;
}
