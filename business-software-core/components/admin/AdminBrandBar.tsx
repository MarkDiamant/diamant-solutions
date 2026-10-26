"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useMemo,useState} from "react";
import DiamantCredit from "./DiamantCredit";
import NewJobMenu from "./NewJobMenu";
type Entry={href:string;label:string;icon:string;permission?:string;module?:string};
type Group={name:string;icon:string;entries:Entry[]};
const groups:Group[]=[
 {name:"Overview",icon:"overview",entries:[{href:"/",label:"Dashboard",icon:"overview"},{href:"/tasks",label:"Tasks",icon:"tasks",module:"tasks"},{href:"/workforce",label:"Scheduling",icon:"scheduling",permission:"view_workforce",module:"workforce"}]},
 {name:"Sales & Customers",icon:"sales",entries:[{href:"/prospects",label:"Prospects",icon:"prospects",module:"prospects"},{href:"/customers",label:"Customers",icon:"customers",permission:"view_customer_details"},{href:"/quotes",label:"Quotes",icon:"quotes",module:"quotes"},{href:"/jobs",label:"Jobs",icon:"jobs",permission:"view_jobs"},{href:"/campaigns",label:"Campaigns",icon:"campaigns",module:"campaigns"}]},
 {name:"Products & Operations",icon:"products",entries:[{href:"/price-book",label:"Price Book",icon:"price",module:"priceBook",permission:"view_pricing"},{href:"/materials",label:"Purchasing & Stock",icon:"materials",permission:"view_stock"},{href:"/operations",label:"Orders & Deliveries",icon:"operations",permission:"view_sales_orders"}]},
 {name:"Finance",icon:"finance",entries:[{href:"/invoices",label:"Invoices",icon:"invoices",module:"invoices",permission:"view_payments_invoices"},{href:"/payments",label:"Payments & Money",icon:"payments",module:"payments",permission:"view_money_overview"},{href:"/labour",label:"Labour Costing",icon:"labour",module:"workforce",permission:"view_costs_profit"}]},
 {name:"Workforce",icon:"workforce",entries:[{href:"/team",label:"Workers & Team",icon:"team",module:"workforce",permission:"view_workforce"},{href:"/worker",label:"My Work & Timesheets",icon:"worker",module:"workforce"}]},
 {name:"Documents",icon:"documents",entries:[{href:"/files",label:"Files",icon:"files",module:"files",permission:"view_files"}]},
 {name:"Administration",icon:"admin",entries:[{href:"/users",label:"Users",icon:"users",permission:"manage_users"},{href:"/integrations",label:"Integrations",icon:"integrations",module:"integrations",permission:"manage_business_settings"},{href:"/settings",label:"Settings",icon:"settings",permission:"manage_business_settings"},{href:"/archive",label:"Archive",icon:"archive",permission:"view_history"}]}
];

const iconPaths:Record<string,string[]>={
 overview:["M3 3h7v7H3z","M14 3h7v7h-7z","M3 14h7v7H3z","M14 14h7v7h-7z"],
 tasks:["M8 6h13","M8 12h13","M8 18h13","m3 6 1 1 2-2","m3 12 1 1 2-2","m3 18 1 1 2-2"],
 scheduling:["M8 2v4","M16 2v4","M3 10h18","M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"],
 sales:["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8","M22 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75"],
 prospects:["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8","M17 11h6","M20 8v6"],
 customers:["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8","M17 8h5","M17 12h5"],
 quotes:["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6","M8 13h8","M8 17h8"],
 jobs:["M3 7h18v13H3z","M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2","M3 13h18","M10 13v2h4v-2"],
 campaigns:["m3 11 18-6v14L3 13z","M7 14l2 7h4l-2-6"],
 products:["M3 7h7v7H3z","M14 7h7v7h-7z","M8 17h8v5H8z"],
 price:["M4 19.5A2.5 2.5 0 0 1 6.5 17H20","M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2"],
 materials:["M3 7l9-5 9 5v10l-9 5-9-5z","M3 7l9 5 9-5","M12 12v10"],
 operations:["M1 5h14v12H1z","M15 9h4l4 4v4h-8","M5 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0","M17 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0"],
 finance:["M3 6h18v14H3z","M3 10h18","M7 15h4"],
 invoices:["M5 2h14v20l-3-2-4 2-4-2-3 2z","M9 8h6","M9 12h6","M9 16h4"],
 payments:["M2 6h20v12H2z","M2 10h20","M6 15h4"],
 labour:["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18","M12 7v5l3 2"],
 workforce:["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8","M22 21v-2a4 4 0 0 0-3-3.87"],
 team:["M3 20h18","M6 15v5","M18 15v5","M5 11l7-7 7 7","M4 11h16v4H4z"],
 worker:["M8 3h8","M9 2h6v3H9z","M5 4H4v18h16V4h-1","m8 14 2 2 5-5"],
 documents:["M3 7V4h7l2 3h9v13H3z"],
 files:["M8 3h10l3 3v15H8z","M3 7v14","M12 11h5","M12 15h5"],
 admin:["M12 3v3","M12 18v3","M3 12h3","M18 12h3","M5.6 5.6l2.1 2.1","M16.3 16.3l2.1 2.1","M18.4 5.6l-2.1 2.1","M7.7 16.3l-2.1 2.1","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"],
 users:["M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8","M4 21v-2a8 8 0 0 1 16 0v2","m17 12 2 2 3-3"],
 integrations:["M8 3v5","M16 3v5","M6 8h12v5a6 6 0 0 1-12 0z","M12 19v3"],
 settings:["M12 3v3","M12 18v3","M3 12h3","M18 12h3","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"],
 archive:["M3 4h18v5H3z","M5 9v12h14V9","M10 13h4"]
};
function NavIcon({name}:{name:string}){return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{(iconPaths[name]||iconPaths.overview).map((d,i)=><path key={i} d={d}/>)}</svg>}

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
 useEffect(()=>{if(!mobileOpen)return;const prior=document.body.style.overflow;document.body.style.overflow="hidden";const key=(e:KeyboardEvent)=>{if(e.key==="Escape")setMobileOpen(false)};document.addEventListener("keydown",key);return()=>{document.removeEventListener("keydown",key);document.body.style.overflow=prior}},[mobileOpen]);
 const available=useMemo(()=>groups.map(group=>({...group,entries:group.entries.filter(e=>config?.modules?.[e.module||""]!==false&&(!e.permission||(permissions===null?Boolean(demo):permissions.includes(e.permission))))})).filter(group=>group.entries.length),[config,permissions,demo]);
 const active=(href:string)=>href==="/"?local==="/":local===href||local.startsWith(href+"/");
 const navigate=()=>{window.dispatchEvent(new Event(NAV_EVENT));setMobileOpen(false);setJobOpen(false)};
 const toggleSection=(name:string)=>setOpenSections(old=>{const next={...old,[name]:!(old[name]??true)};try{localStorage.setItem(sectionsKey,JSON.stringify(next))}catch{}return next});
 const toggleCompact=()=>setCompact(old=>{try{localStorage.setItem(storeKey,old?"0":"1")}catch{}return !old});
 async function logout(){await fetch("/api/admin/auth/logout",{method:"POST"});router.replace("/login");router.refresh()}
 if(local==="/login")return null;
 const brand=config?.accentColour||"#e66a24";
 const link=(e:Entry)=> <Link key={e.href} href={go(e.href)} onClick={navigate} title={compact?e.label:undefined} aria-current={active(e.href)?"page":undefined} className={"bms-side-link "+(active(e.href)?"bms-side-active":"")} style={active(e.href)?{"--nav-accent":brand} as React.CSSProperties:undefined}><span className="bms-side-icon" aria-hidden="true"><NavIcon name={e.icon}/></span><span className="bms-side-label">{e.label}</span></Link>;
 return <>
 <header className="bms-app-header print:hidden">
  <div className="bms-app-header-inner">
   <button className="bms-menu-trigger" type="button" aria-label={mobileOpen?"Close navigation":"Open navigation"} aria-expanded={mobileOpen} aria-controls="bms-sidebar" onClick={()=>{if(!mobileOpen)setOpenSections(Object.fromEntries(groups.map(g=>[g.name,true])));setMobileOpen(v=>!v)}}>{mobileOpen?<span aria-hidden="true">×</span>:<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>}</button>
   <Link href={go("/")} onClick={navigate} className="bms-brand-link">
    {config?.logoUrl?<img src={config.logoUrl} alt={config.businessName||"Business"} className="bms-brand-logo"/>:<span className="bms-brand-placeholder">BMS</span>}
    <span className="bms-brand-details"><strong style={{color:brand}}>{config?.businessName||"Business Management"}</strong><DiamantCredit compact/></span>
   </Link>
   <div className="bms-header-actions">
    <Link href={go("/ai")} onClick={navigate} aria-label="Ask Ruby" className="bms-ruby-link bms-header-ruby" style={{borderColor:brand,color:brand}}><img className="bms-ruby-avatar" src="https://res.cloudinary.com/ds3zepqin/image/upload/v1791154904/ruby-ai-business-assistant.webp" alt=""/> <span>Ask Ruby</span></Link>
    {(permissions===null?Boolean(demo):permissions.includes("edit_jobs"))&&<div className="bms-new-job bms-header-new-job">
     <button type="button" onClick={()=>setJobOpen(v=>!v)} aria-expanded={jobOpen} aria-haspopup="true" className="bms-new-job-button" style={{backgroundColor:brand}}>+ New Job</button>
     {jobOpen&&<div className="bms-job-popover"><Link href={go("/jobs/new?quick=1")} onClick={navigate}>Quick add job</Link><Link href={go("/jobs/new")} onClick={navigate}>Full new job</Link></div>}
    </div>}
   </div>
  </div>
 </header>
 {mobileOpen&&<button className="bms-sidebar-backdrop" type="button" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}/>}
 <aside id="bms-sidebar" aria-label="Business software navigation" className={"bms-sidebar print:hidden "+(compact?"bms-sidebar-compact ":"")+(mobileOpen?"bms-sidebar-mobile-open":"")}>
  <div className="bms-sidebar-top"><span className="bms-side-label">WORKSPACE</span><button type="button" className="bms-compact-toggle" aria-label={compact?"Expand sidebar":"Collapse to icons"} title={compact?"Expand sidebar":"Collapse to icons"} onClick={toggleCompact}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16v16H4z"/><path d={compact?"m10 9 3 3-3 3":"m14 9-3 3 3 3"}/></svg></button></div>
  <nav aria-label="Main navigation" className="bms-sidebar-scroll">
   <div className="bms-mobile-quick-actions">{(permissions===null?Boolean(demo):permissions.includes("edit_jobs"))&&<div className="bms-mobile-new-job"><NewJobMenu accent={brand} basePath={prefix}/></div>}<Link href={go("/ai")} onClick={navigate} className="bms-mobile-ruby-link" aria-label="Ask Ruby"><img src="https://res.cloudinary.com/ds3zepqin/image/upload/v1791154904/ruby-ai-business-assistant.webp" alt="" className="bms-ruby-avatar"/><span>Ask Ruby</span></Link></div>
   {available.map(group=>{const expanded=mobileOpen?openSections[group.name]!==false:openSections[group.name]??true;const selected=group.entries.some(e=>active(e.href));return <section key={group.name} className="bms-nav-section"><button type="button" className={"bms-nav-heading "+(selected?"bms-nav-heading-active":"")} onClick={()=>toggleSection(group.name)} aria-expanded={expanded} title={compact?group.name:undefined}><span className="bms-side-icon" aria-hidden="true"><NavIcon name={group.icon}/></span><span className="bms-side-label">{group.name}</span><span className="bms-section-chevron bms-side-label" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></span></button>{expanded&&<div className="bms-nav-links">{group.entries.map(link)}</div>}</section>})}
  </nav>
  <div className="bms-sidebar-bottom"><button type="button" className="bms-side-link bms-logout" onClick={()=>void logout()} title="Log out"><span className="bms-side-icon" aria-hidden="true"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></span><span className="bms-side-label">Sign out</span></button></div>
 </aside>
 </>;
}
