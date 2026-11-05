import type {Metadata} from "next";
import "./bms.css";
import "./quick-edit-actions.css";
import AdminBrandBar from "@/components/admin/AdminBrandBar";
import DiamantCredit from "@/components/admin/DiamantCredit";
import BmsRuntimeGuard from "@/components/BmsRuntimeGuard";
import {runtimeTenant} from "@/lib/business-software/runtime";
import {publicTenantSettings} from "@/lib/business-software/db";
import DemoSelector from "@/components/DemoSelector";
export async function generateMetadata():Promise<Metadata>{const tenant=await runtimeTenant();return {title:tenant?`${tenant.business_name} | Business Management Software`:"Business Management Software | Diamant Solutions",description:"Bespoke business management software built around your business.",openGraph:{title:"Business Management Software | Diamant Solutions",description:"Your entire business. One system. Built around the way your business works.",images:[{url:"https://bms.diamantsolutions.co.uk/_next/image?url=%2Fbms-og.png&w=1200&q=80",width:1200,height:637,alt:"Diamant Solutions Business Management Software"}],type:"website"},robots:{index:false,follow:false,nocache:true},manifest:"/api/business-software/manifest",icons:{icon:{url:"/api/business-software/icon?v=tenant-branding-2",type:"image/svg+xml"},shortcut:{url:"/api/business-software/icon?v=tenant-branding-2",type:"image/svg+xml"},apple:{url:"/api/business-software/icon?v=tenant-branding-2",type:"image/svg+xml"}}};}
export const dynamic="force-dynamic";
export default async function BmsRuntimeLayout({children}:{children:React.ReactNode}){
 const tenant=await runtimeTenant(),live=Boolean(tenant),login=false;
 const publicSettings=tenant?.slug?await publicTenantSettings(tenant.slug).catch(()=>null):null;
 const rawAccent=String(publicSettings?.accent_colour||"");
 const accent=/^#[0-9a-fA-F]{6}$/.test(rawAccent)?rawAccent:undefined;
 return <div className="bms-shell" style={accent?({"--bms-accent":accent,"--nav-accent":accent} as React.CSSProperties):undefined}>{!live&&<BmsRuntimeGuard/>}{!live&&<><div className="bg-[#17385f] px-4 py-2 text-center text-xs font-black text-white print:hidden">DEMO MODE · Fictional data · Try editing anything · Changes reset automatically</div><DemoSelector/></>}{!login&&<><AdminBrandBar fictionalDemo={!live}/></>}{children}{!login&&<footer className="bms-footer print:hidden"><DiamantCredit dark/></footer>}</div>;
}