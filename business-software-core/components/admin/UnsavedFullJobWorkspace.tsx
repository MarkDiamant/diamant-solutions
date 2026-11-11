"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import NewJobFormV2 from "./NewJobFormV2";

const tabs=["Overview","Activity","Quote","Invoice","Materials & Orders","Finances","Workforce","Files","Split Job/Order"] as const;
export default function UnsavedFullJobWorkspace(){
 const router=useRouter();
 const [tab,setTab]=useState<(typeof tabs)[number]>("Overview");
 const [cancelConfirm,setCancelConfirm]=useState(false);
 const [resumeTab,setResumeTab]=useState<(typeof tabs)[number]>("Overview");
 const [draft,setDraft]=useState<Record<string,string>>({});
 const update=(key:string,value:string)=>setDraft(previous=>({...previous,[key]:value}));
 const draftFields:Partial<Record<(typeof tabs)[number],{label:string;key:string;type?:"date"|"number"}[]>>={
  "Activity":[{label:"Next action",key:"nextAction"},{label:"Next action date",key:"nextActionAt",type:"date"}],
  "Quote":[{label:"Preliminary estimate (£)",key:"preliminaryEstimate",type:"number"}],
  "Invoice":[{label:"Customer purchase order / reference",key:"customerReference"}],
  "Materials & Orders":[{label:"Material requirements and notes",key:"materialsNotes"}],
  "Finances":[{label:"Expected quoted amount (£)",key:"quotedAmount",type:"number"}],
  "Workforce":[{label:"Assigned manager",key:"manager"}],
  "Files":[],
  "Split Job/Order":[]
 };
 
 return <main className="min-h-screen bg-[#f5f5f2] p-4 sm:p-7">
 <header className="mb-5"><h1 className="text-2xl font-black">Full Job workspace</h1><p className="mt-2 text-sm text-slate-600">New job, not yet saved. No reference is reserved until you save the Overview details. Draft details can be entered in the sections below before saving. Transactions, attachments and job splits require a saved job.</p></header>
 <nav aria-label="Job workspace sections" className="mb-5 flex flex-wrap gap-2">{tabs.map(t=><button key={t} type="button" aria-current={tab===t?"page":undefined} onClick={()=>{setTab(t);if(t!=="Overview")setResumeTab(t)}} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab===t?"bg-slate-900 text-white":"bg-white text-slate-700 border border-slate-200"}`}>{t}</button>)}</nav>
 <div hidden={tab!=="Overview"}><NewJobFormV2 embedded forceFull additionalDraft={draft} onCancel={()=>setCancelConfirm(true)} onSaved={ref=>{if(!ref)return;const prefix=window.location.pathname.startsWith("/bms-runtime")?"/bms-runtime":window.location.pathname.startsWith("/admin")?"/admin":"";router.replace(`${prefix}/jobs/${encodeURIComponent(ref)}?tab=${encodeURIComponent(resumeTab)}`);router.refresh();}}/></div>{tab!=="Overview"&&<section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">{tab}</h2><p className="mt-2 text-sm text-slate-600">Enter any available draft details now. Saved-job transactions and records become available after the initial job is created.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{(draftFields[tab]||[]).map(field=><label key={field.key} className="block text-sm font-semibold">{field.label}<input type={field.type||"text"} min={field.type==="number"?"0":undefined} step={field.type==="number"?"0.01":undefined} value={draft[field.key]||""} onChange={event=>update(field.key,event.target.value)} className="mt-2 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>)}</div>{(draftFields[tab]||[]).length===0&&<p className="mt-4 text-sm">This section manages saved-job records. No reference or related record is created before the job is saved.</p>}<button type="button" className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white" onClick={()=>setTab("Overview")}>Return to Overview to save job</button></section>}
 {cancelConfirm&&<div role="alertdialog" aria-modal="true" aria-label="Discard unsaved job" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h2 className="text-lg font-bold">Discard unsaved job?</h2><p className="mt-2 text-sm">All unsaved information will be lost. No job reference has been allocated.</p><div className="mt-5 flex gap-3"><button type="button" onClick={()=>setCancelConfirm(false)} className="rounded-lg border px-4 py-2">Keep editing</button><button type="button" onClick={()=>router.replace(window.location.pathname.startsWith("/bms-runtime")?"/bms-runtime":"/admin")} className="rounded-lg bg-red-700 px-4 py-2 text-white">Discard job</button></div></div></div>}
 </main>;
}
