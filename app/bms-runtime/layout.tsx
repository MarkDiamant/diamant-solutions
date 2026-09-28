import type {Metadata} from "next";
import "./bms.css";
import AdminBrandBar from "@/components/admin/AdminBrandBar";
import AdminPrimaryNav from "@/components/admin/AdminPrimaryNav";
import DiamantCredit from "@/components/admin/DiamantCredit";
import BmsRuntimeGuard from "@/components/BmsRuntimeGuard";
import {runtimeTenant} from "@/lib/business-software/runtime";
import DemoSelector from "@/components/DemoSelector";
export async function generateMetadata():Promise<Metadata>{const tenant=await runtimeTenant();return {title:tenant?`${tenant.business_name} | Business Management Software`:"Business Management Software | Diamant Solutions",description:"Bespoke business management software built around your business.",openGraph:{title:"Business Management Software | Diamant Solutions",description:"Your entire business. One system. Built around the way your business works.",images:["https://bms.diamantsolutions.co.uk/bms-og.png"],type:"website"},robots:{index:false,follow:false,nocache:true},manifest:"/api/business-software/manifest",icons:{icon:"/favicon.ico?v=tenant-branding-1",shortcut:"/favicon.ico?v=tenant-branding-1",apple:"/favicon.ico?v=tenant-branding-1"}};}
export const dynamic="force-dynamic";
export default async function BmsRuntimeLayout({children}:{children:React.ReactNode}){
 const tenant=await runtimeTenant(),live=Boolean(tenant),login=false;
 return <div className="bms-shell">{!live&&<BmsRuntimeGuard/>}{!live&&<><div className="bg-[#17385f] px-4 py-2 text-center text-xs font-black text-white print:hidden">DEMO MODE · Fictional data · Try editing anything · Changes reset automatically</div><DemoSelector/></>}{!login&&<><AdminBrandBar/><AdminPrimaryNav/></>}{children}{!login&&<footer className="bms-footer print:hidden"><DiamantCredit dark/></footer>}</div>;
}