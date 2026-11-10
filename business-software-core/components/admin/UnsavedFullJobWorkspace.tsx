"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import NewJobFormV2 from "./NewJobFormV2";

const tabs=["Overview","Activity","Quote","Invoice","Materials & Orders","Finances","Workforce","Files","Split Job/Order"] as const;
export default function UnsavedFullJobWorkspace(){
 const router=useRouter();
 const [tab,setTab]=useState<(typeof tabs)[number]>("Overview");
 
 return <main className="min-h-screen bg-[#f5f5f2] p-4 sm:p-7">
 <header className="mb-5"><h1 className="text-2xl font-black">Full Job workspace</h1><p className="mt-2 text-sm text-slate-600">New job, not yet saved. No reference is reserved until you save the Overview details. All other sections become available after creation.</p></header>
 <nav aria-label="Job workspace sections" className="mb-5 flex flex-wrap gap-2">{tabs.map(t=><button key={t} type="button" aria-current={tab===t?"page":undefined} onClick={()=>setTab(t)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab===t?"bg-slate-900 text-white":"bg-white text-slate-700 border border-slate-200"}`}>{t}</button>)}</nav>
 <div hidden={tab!=="Overview"}><NewJobFormV2 embedded forceFull onCancel={()=>router.back()} onSaved={ref=>{if(!ref)return;const prefix=window.location.pathname.startsWith("/bms-runtime")?"/bms-runtime":window.location.pathname.startsWith("/admin")?"/admin":"";router.replace(`${prefix}/jobs/${encodeURIComponent(ref)}`);router.refresh();}}/></div>{tab!=="Overview"&&<section role="status" className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">{tab}</h2><p className="mt-2 text-sm">Save the job on Overview to activate this section. No data has been created or reference consumed.</p><button type="button" className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white" onClick={()=>setTab("Overview")}>Complete job creation</button></section>}
 </main>;
}
