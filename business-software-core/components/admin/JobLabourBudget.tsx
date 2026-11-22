"use client";
import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import {compareJobLabour,estimateHours,labourTimeLabel,recordedHours,type LabourActual,type LabourEstimate} from "@/lib/business-software/job-labour-comparison";
type RecordData={reference:string;job:{id:string};budgets:LabourEstimate[];actual:LabourActual|undefined};
const field="w-full rounded-lg border border-slate-300 p-2";
function recordedDate(value:string|null|undefined){if(!value)return "Date not recorded";const date=new Date(value);return Number.isNaN(date.getTime())?"Date not recorded":date.toLocaleDateString("en-GB")}
export default function JobLabourBudget({reference,jobId}:{reference:string;jobId:string}) {
 const [record,setRecord]=useState<RecordData|null>(null),[hours,setHours]=useState(""),[install,setInstall]=useState(""),[cost,setCost]=useState(""),[reason,setReason]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[savedButUnread,setSavedButUnread]=useState(false);
 const request=useRef(0),pendingSave=useRef<{version:number;fabrication:number;installation:number;cost:number|null;reason:string}|null>(null);
 const load=useCallback(async(signal?:AbortSignal)=>{
  const serial=++request.current;
  const response=await fetch("/api/admin/worker/labour-summary?job_id="+encodeURIComponent(jobId)+"&reference="+encodeURIComponent(reference),{cache:"no-store",signal});const body=await response.json();
  if(!response.ok)throw Error(body.error||"Unable to load labour estimates");
  if(body.completeness?.complete!==true||body.completeness?.job_id!==jobId)throw Error("Complete labour records could not be verified. No comparison is shown.");
  if(!Array.isArray(body.jobs)||!Array.isArray(body.budgets)||!Array.isArray(body.actuals))throw Error("Labour estimates are unavailable. No records were changed.");
  const job=body.jobs.find((item:{reference:string;id:string})=>item.reference===reference&&item.id===jobId);
  if(!job)throw Error("This job is not available in the labour records.");
  const budgets=body.budgets.filter((item:LabourEstimate)=>item.job_id===job.id),comparison=compareJobLabour(budgets,undefined);
  if(serial!==request.current||signal?.aborted)return;
  setRecord({reference,job,budgets,actual:body.actuals.find((item:LabourActual)=>item.job_id===job.id)});
  setHours(comparison.latest?String(comparison.latest.fabrication_hours):"");setInstall(comparison.latest?String(comparison.latest.installation_hours):"");setCost(comparison.latest?.cost_budget==null?"":String(comparison.latest.cost_budget));
  const pending=pendingSave.current;if(pending&&!budgets.some((item:LabourEstimate)=>Number(item.version)>pending.version&&Number(item.fabrication_hours)===pending.fabrication&&Number(item.installation_hours)===pending.installation&&(item.cost_budget==null?null:Number(item.cost_budget))===pending.cost&&String(item.reason||"")===pending.reason))throw Error("The attempted save is not yet confirmed in the complete history. No further revision will be sent. Reload the history again to reconcile it.");
  if(pending)pendingSave.current=null;
 },[reference,jobId]);
 useEffect(()=>{const controller=new AbortController();setRecord(null);setError("");void load(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Unable to load labour estimates")});return()=>{request.current++;controller.abort()}},[load]);
 const current=record?.reference===reference&&record.job.id===jobId?record:null;
 const comparison=compareJobLabour(current?.budgets||[],current?.actual);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!current||busy||savedButUnread)return;setBusy(true);setError("");pendingSave.current={version:Number(comparison.latest?.version||0),fabrication:Number(hours),installation:Number(install),cost:cost===""?null:Number(cost),reason};
  let saved=false,acknowledged=false;try{const response=await fetch("/api/admin/worker/budget",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_id:current.job.id,fabrication_hours:Number(hours),installation_hours:Number(install),cost_budget:cost===""?null:Number(cost),reason})});acknowledged=true;const body=await response.json().catch(()=>({}));if(!response.ok)throw Error(body.error||"Unable to save labour budget");saved=true;setRecord(null);setReason("");await load();setSavedButUnread(false);}
  catch(e){if(saved){setSavedButUnread(true);setError("The estimate was saved, but its updated history could not be loaded. Reload it before saving again.")}else if(!acknowledged){setRecord(null);setSavedButUnread(true);setError("Save was not confirmed. Reload the estimate history before trying again.")}else {setRecord(null);setSavedButUnread(true);setError("Save was not confirmed. Reload the estimate history before trying again.")}}finally{setBusy(false)}
 }
 const difference=comparison.difference,over=difference!==null&&difference>0;
 return <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-4" aria-label="Job labour estimate and actual time">
  <h3 className="font-bold">Estimated vs actual labour</h3>
  <p className="mt-1 text-sm text-slate-600">Keep the estimate and compare it with time recorded for this job. Days below are 8-hour labour equivalents, not calendar days. Actual time comes from timesheets, not the job's scheduled dates.</p>
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  {savedButUnread&&<button type="button" disabled={busy} className="mt-3 rounded-lg border px-3 py-2 text-sm font-bold" onClick={async()=>{setBusy(true);try{await load();setSavedButUnread(false);setError("")}catch(e){setError(e instanceof Error?e.message:"Unable to reload the saved estimate")}finally{setBusy(false)}}}>Reload estimate history</button>}
  {current?<>
   <div className="mt-4 grid gap-3 md:grid-cols-3">
    <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-600">{comparison.original?"Original estimate":comparison.baseline?`Recorded estimate v${comparison.baseline.version}`:"Estimate"}</p><p className="mt-1 font-bold">{comparison.baseline?labourTimeLabel(comparison.planned):"No estimate saved"}</p></div>
    <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-600">Actual time recorded so far</p><p className="mt-1 font-bold">{comparison.worked===null?"No time recorded":labourTimeLabel(comparison.worked)}</p></div>
    <div className={"rounded-xl p-4 "+(over?"bg-red-50 text-red-800":"bg-slate-50")}><p className="text-sm">Difference from {comparison.original?"original":"recorded"} estimate</p><p className="mt-1 font-bold">{difference===null?"Waiting for estimate and time":difference===0?"On estimate":`${labourTimeLabel(Math.abs(difference))} ${over?"over":"under"}`}</p></div>
   </div>
   {comparison.latest&&comparison.original&&comparison.latest.version!==comparison.original.version&&<p className="mt-3 text-sm text-slate-700">Latest revised estimate: {labourTimeLabel(estimateHours(comparison.latest))} (v{comparison.latest.version}). The original estimate stays above so revisions do not hide the difference.</p>}
   {comparison.latest&&!comparison.original&&<p className="mt-3 text-sm text-amber-800">The original estimate is not in the loaded records. This comparison uses revision {comparison.latest.version}.</p>}
   <p className="mt-3 text-sm text-slate-600">Time is recorded so far, not a claim that the job is finished. This comparison does not calculate pay or actual labour costs.</p>
   {comparison.versions.length>0&&<details className="mt-4 rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-bold">Estimate history ({comparison.versions.length} {comparison.versions.length===1?"revision":"revisions"} loaded)</summary><ol className="mt-3 space-y-3">{comparison.versions.map(estimate=><li key={estimate.id||estimate.version} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-bold">Revision {estimate.version}{estimate.version===1?" · Original estimate":""} · {labourTimeLabel(estimateHours(estimate))}</p><p className="mt-1 text-slate-600">{recordedDate(estimate.approved_at)} · Fabrication: {labourTimeLabel(recordedHours(estimate.fabrication_hours))} · Installation: {labourTimeLabel(recordedHours(estimate.installation_hours))}</p><p className="mt-1">{estimate.reason||"No revision reason recorded."}</p></li>)}</ol></details>}
   <form onSubmit={save} className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
    <p className="text-sm text-slate-600 sm:col-span-2">{comparison.latest?`Revise the latest estimate (v${comparison.latest.version}). Saving adds a version; it does not change the original.`:"Record the first estimate before work starts. Leave actual time to the timesheets."} Enter hours; 32 hours is 4 reporting days.</p>
    <label className="text-sm">Estimated fabrication hours<input required min="0" step="0.25" type="number" className={field} value={hours} onChange={e=>setHours(e.target.value)}/></label>
    <label className="text-sm">Estimated installation hours<input required min="0" step="0.25" type="number" className={field} value={install} onChange={e=>setInstall(e.target.value)}/></label>
    <label className="text-sm">Budget labour cost (£)<input min="0" step="0.01" type="number" className={field} value={cost} onChange={e=>setCost(e.target.value)}/></label>
    <label className="text-sm">Revision reason<input maxLength={1000} className={field} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <button type="submit" disabled={busy||savedButUnread||hours===""||install===""} className="rounded-lg bg-[var(--bms-accent)] px-4 py-2 font-bold text-white disabled:opacity-50">{busy?"Saving…":comparison.latest?"Save revised estimate":"Save labour estimate"}</button>
   </form>
  </>:!error&&<p role="status" className="mt-3 text-sm text-slate-600">Loading labour estimates and timesheets…</p>}
 </section>;
}
