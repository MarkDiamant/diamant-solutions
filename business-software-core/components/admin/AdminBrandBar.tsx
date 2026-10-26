"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useMemo,useState} from "react";
import DiamantCredit from "./DiamantCredit";
type Entry={href:string;label:string;icon:string;permission?:string;module?:string};
type Group={name:string;icon:string;entries:Entry[]};
const groups:Group[]=[
 {name:"Overview",icon:"▦",entries:[{href:"/",label:"Dashboard",icon:"▦"},{href:"/tasks",label:"Tasks",icon:"☑",module:"tasks"},{href:"/workforce",label:"Scheduling",icon:"▤",permission:"view_workforce",module:"workforce"}]},
 {name:"Sales & Customers",icon:"◇",entries:[{href:"/prospects",label:"Prospects",icon:"◎",module:"prospects"},{href:"/customers",label:"Customers",icon:"♙",permission:"view_customer_details"},{href:"/quotes",label:"Quotes",icon:"▤",module:"quotes"},{href:"/jobs",label:"Jobs",icon:"▣",permission:"view_jobs"},{href:"/campaigns",label:"Campaigns",icon:"✧",module:"campaigns"}]},
 {name:"Products & Operations",icon:"▧",entries:[{href:"/price-book",label:"Price Book",icon:"▤",module:"priceBook",permission:"view_pricing"},{href:"/materials",label:"Purchasing & Stock",icon:"▧",permission:"view_stock"},{href:"/operations",label:"Orders & Deliveries",icon:"▣",permission:"view_sales_orders"}]},
 {name:"Finance",icon:"£",entries:[{href:"/invoices",label:"Invoices",icon:"▤",module:"invoices",permission:"view_payments_invoices"},{href:"/payments",label:"Payments & Money",icon:"£",module:"payments",permission:"view_money_overview"},{href:"/labour",label:"Labour Costing",icon:"◷",module:"workforce",permission:"view_costs_profit"}]},
 {name:"Workforce",icon:"♙",entries:[{href:"/team",label:"Workers & Team",icon:"♙",module:"workforce",permission:"view_workforce"},{href:"/worker",label:"My Work & Timesheets",icon:"◷",module:"workforce"}]},
 {name:"Documents",icon:"▤",entries:[{href:"/files",label:"Files",icon:"▤",module:"files",permission:"view_files"}]},
 {name:"Administration",icon:"⚙",entries:[{href:"/users",label:"Users",icon:"♙",permission:"manage_users"},{href:"/integrations",label:"Integrations",icon:"⌘",module:"integrations",permission:"manage_business_settings"},{href:"/settings",label:"Settings",icon:"⚙",permission:"manage_business_settings"},{href:"/archive",label:"Archive",icon:"▣",permission:"view_history"}]}
];
const demoKeys=["northstar","electrical","insurance","studio","consultancy","distribution","flooring"];
const storeKey="bms-sidebar-collapsed";
const sectionsKey="bms-sidebar-sections";
const NAV_EVENT="bms-nav-start";
export default function AdminBrandBar(){
 const pathname=usePathname(),router=useRouter();
 const parts=pathname.split("/").filter(Boolean),demo=demoKeys.includes(parts[0])?parts[0]:null;
 const prefix=demo?"/"+demo:pathname.startsWith("/bms-runtime")?"/bms-runtime":"";
 const local=pathname.slice(prefix.length)||"/";
 const go=(href:string)=>prefix+(href==="/"?"/":href);
 const [config,setConfig]=useState<any>(null),[permissions,setPermissions]=useState<string[]|null>(null);
 const [mobileOpen,setMobileOpen]=useState(false),[compact,setCompact]=useState(false);
 const [openSections,setOpenSections]=useState<Record<string,boolean>>({});
 const [jobOpen,setJobOpen]=useState(false);
 useEffect(()=>{try{setConfig(JSON.parse(sessionStorage.getItem("bms-tenant-config")||"null"));setCompact(localStorage.getItem(storeKey)==="1");setOpenSections(JSON.parse(localStorage.getItem(sectionsKey)||"{}"));}catch{}},[]);
 useEffect(()=>{let live=true;fetch("/api/admin/settings",{cache:"no-store"}).then(async r=>{if(r.ok){const d=await r.json();if(live&&d.settings){setConfig(d.settings);sessionStorage.setItem("bms-tenant-config",JSON.stringify(d.settings));}}}).catch(()=>{});fetch("/api/admin/session",{cache:"no-store"}).then(async r=>{if(r.ok){const d=await r.json();if(live&&Array.isArray(d.admin?.permissions))setPermissions(d.admin.permissions);}}).catch(()=>{});return()=>{live=false}},[]);
 useEffect(()=>{setMobileOpen(false);setJobOpen(false)},[pathname]);
 useEffect(()=>{if(!mobileOpen)return;const key=(e:KeyboardEvent)=>{if(e.key==="Escape")setMobileOpen(false)};document.addEventListener("keydown",key);return()=>document.removeEventListener("keydown",key)},[mobileOpen]);
 const available=useMemo(()=>groups.map(group=>({...group,entries:group.entries.filter(e=>config?.modules?.[e.module||""]!==false&&(!e.permission||permissions===null||permissions.includes(e.permission)))})).filter(group=>group.entries.length),[config,permissions]);
 const active=(href:string)=>href==="/"?local==="/":local===href||local.startsWith(href+"/");
 const navigate=()=>{window.dispatchEvent(new Event(NAV_EVENT));setMobileOpen(false);setJobOpen(false)};
 const toggleSection=(name:string)=>setOpenSections(old=>{const next={...old,[name]:!(old[name]??true)};try{localStorage.setItem(sectionsKey,JSON.stringify(next))}catch{}return next});
 const toggleCompact=()=>setCompact(old=>{try{localStorage.setItem(storeKey,old?"0":"1")}catch{}return !old});
 async function logout(){await fetch("/api/admin/auth/logout",{method:"POST"});router.replace("/login");router.refresh()}
 if(local==="/login")return null;
 const brand=config?.accentColour||"#e66a24";
 const link=(e:Entry)=> <Link key={e.href} href={go(e.href)} onClick={navigate} title={compact?e.label:undefined} aria-current={active(e.href)?"page":undefined} className={"bms-side-link "+(active(e.href)?"bms-side-active":"")} style={active(e.href)?{backgroundColor:brand,color:"#fff"}:undefined}><span className="bms-side-icon" aria-hidden="true">{e.icon}</span><span className="bms-side-label">{e.label}</span></Link>;
 return <>
 <header className="bms-app-header print:hidden">
  <div className="bms-app-header-inner">
   <button className="bms-menu-trigger" type="button" aria-label={mobileOpen?"Close navigation":"Open navigation"} aria-expanded={mobileOpen} aria-controls="bms-sidebar" onClick={()=>setMobileOpen(v=>!v)}>{mobileOpen?"✕":"☰"}</button>
   <Link href={go("/")} onClick={navigate} className="bms-brand-link">
    {config?.logoUrl?<img src={config.logoUrl} alt={config.businessName||"Business"} className="bms-brand-logo"/>:<span className="bms-brand-placeholder">BMS</span>}
    <span className="bms-brand-details"><strong style={{color:brand}}>{config?.businessName||"Business Management"}</strong><small>{config?.systemName||"Business Management Software"}</small><DiamantCredit compact/></span>
   </Link>
   <div className="bms-header-actions">
    <Link href={go("/ai")} onClick={navigate} className="bms-ruby-link" style={{borderColor:brand,color:brand}}><span aria-hidden="true">✦</span> <span>Ask Ruby</span></Link>
    <div className="bms-new-job">
     <button type="button" onClick={()=>setJobOpen(v=>!v)} aria-expanded={jobOpen} aria-haspopup="true" className="bms-new-job-button" style={{backgroundColor:brand}}>+ New Job</button>
     {jobOpen&&<div className="bms-job-popover"><Link href={go("/#quick-add")} onClick={navigate}>Quick add job</Link><Link href={go("/jobs/new")} onClick={navigate}>Full new job</Link></div>}
    </div>
   </div>
  </div>
 </header>
 {mobileOpen&&<button className="bms-sidebar-backdrop" type="button" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}/>}
 <aside id="bms-sidebar" aria-label="Business software navigation" className={"bms-sidebar print:hidden "+(compact?"bms-sidebar-compact ":"")+(mobileOpen?"bms-sidebar-mobile-open":"")}>
  <div className="bms-sidebar-top"><span className="bms-side-label">WORKSPACE</span><button type="button" className="bms-compact-toggle" aria-label={compact?"Expand sidebar":"Collapse to icons"} title={compact?"Expand sidebar":"Collapse to icons"} onClick={toggleCompact}>{compact?"»":"«"}</button></div>
  <nav aria-label="Main navigation" className="bms-sidebar-scroll">
   {available.map(group=>{const expanded=openSections[group.name]??true;const selected=group.entries.some(e=>active(e.href));return <section key={group.name} className="bms-nav-section"><button type="button" className={"bms-nav-heading "+(selected?"bms-nav-heading-active":"")} onClick={()=>toggleSection(group.name)} aria-expanded={expanded} title={compact?group.name:undefined}><span className="bms-side-icon" aria-hidden="true">{group.icon}</span><span className="bms-side-label">{group.name}</span><span className="bms-section-chevron bms-side-label" aria-hidden="true">{expanded?"⌄":"›"}</span></button>{(expanded||compact)&&<div className="bms-nav-links">{group.entries.map(link)}</div>}</section>})}
  </nav>
  <div className="bms-sidebar-bottom"><button type="button" className="bms-side-link bms-logout" onClick={()=>void logout()} title="Log out"><span className="bms-side-icon" aria-hidden="true">↪</span><span className="bms-side-label">Log out</span></button></div>
 </aside>
 </>;
}
