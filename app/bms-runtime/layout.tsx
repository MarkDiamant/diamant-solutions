import type {Metadata} from "next";
import "./bms.css";
import AdminBrandBar from "@/components/admin/AdminBrandBar";
import AdminPrimaryNav from "@/components/admin/AdminPrimaryNav";
import DiamantCredit from "@/components/admin/DiamantCredit";
import BmsRuntimeGuard from "@/components/BmsRuntimeGuard";
import {runtimeTenant} from "@/lib/business-software/runtime";
export async function generateMetadata():Promise<Metadata>{const tenant=await runtimeTenant();return {title:tenant?`${tenant.business_name} | Business Management Software`:"Business Management Software | Diamant Solutions",robots:{index:false,follow:false,nocache:true},manifest:"/api/business-software/manifest",icons:{icon:"/favicon.ico?v=tenant-branding-1",shortcut:"/favicon.ico?v=tenant-branding-1",apple:"/favicon.ico?v=tenant-branding-1"}};}
export const dynamic="force-dynamic";
export default async function BmsRuntimeLayout({children}:{children:React.ReactNode}){
 const tenant=await runtimeTenant(),live=Boolean(tenant),login=false;
 return <div className="bms-shell">{!live&&<BmsRuntimeGuard/>}{!live&&<><div className="bg-[#17385f] px-4 py-2 text-center text-xs font-black text-white print:hidden">DEMO MODE · Fictional data · External actions are disabled · Changes reset automatically</div><div className="flex flex-wrap items-center justify-center gap-2 border-b border-black/10 bg-white px-3 py-2 text-xs font-bold print:hidden"><span>View demo as:</span>{[["northstar","Property & Projects"],["electrical","Electrician"],["insurance","Insurance"],["studio","Creative Agency"],["consultancy","Consultancy"],["distribution","Distribution"]].map(([key,label])=><a key={key} href={`/?sample=${key}`} className="rounded-full border border-black/15 bg-[#f7f7f4] px-3 py-1.5 hover:bg-black hover:text-white">{label}</a>)}</div></>}{!login&&<><AdminBrandBar/><AdminPrimaryNav/></>}{children}{!login&&<footer className="bms-footer print:hidden"><DiamantCredit dark/></footer>}</div>;
}