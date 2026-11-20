"use client";
import {useEffect,useRef,useState} from "react";
import {DONE_STAGES} from "../../lib/job-followup.cjs";
import {REMINDER_DAYS,completionRequest} from "../../lib/task-completion.cjs";
const field="mt-1 h-11 w-full min-w-0 rounded-xl border border-black/20 bg-white px-3 text-sm outline-none focus:border-[#e66a24] focus:ring-2 focus:ring-orange-200";
const local=(date:Date)=>{const p=(n:number)=>String(n).padStart(2,"0");return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`};
const choices=[
 ["finish","Done, no more reminders","Finish this reminder. Keep the job at its current stage."],
 ["later","Not done yet, remind me later","Move this same reminder to later. Do not mark it done."],
 ["stage","Done, move the job on","Choose the next action and job stage, then set its reminder."],
 ["followup","Done, add another reminder","Keep the current stage and action, with a new reminder date."]
];
export default function JobFollowupDialog({task,accent,busy=false,onCancel,onConfirm}:{task:any;accent:string;busy?:boolean;onCancel:()=>void;onConfirm:(request:any)=>void}){
 const [intent,setIntent]=useState(""),[at,setAt]=useState(""),[stage,setStage]=useState(""),[days,setDays]=useState<number|null>(null);
 const box=useRef<HTMLDivElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;box.current?.focus();const overflow=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=overflow;previous?.focus()}},[]);
 const chosen=DONE_STAGES.find(([key])=>key===stage);
 const result=completionRequest({intent,at,stage,days,currentStage:task?.job_status});
 const reminderAt=at&&!Number.isNaN(new Date(at).getTime())?new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"}).format(new Date(at)):"";
 const needsDate=intent==="stage"||intent==="followup";
 const button=intent==="finish"?"Finish, no more reminders":intent==="later"?"Save later reminder":intent==="stage"?"Save stage and reminder":intent==="followup"?"Finish and save next reminder":"Choose an option";
 return <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/55 p-3 sm:p-4" onClick={e=>{if(e.target===e.currentTarget&&!busy)onCancel()}}>
  <div ref={box} role="dialog" aria-modal="true" aria-labelledby="followup-title" aria-describedby="followup-description" tabIndex={-1} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl bg-white p-4 shadow-2xl outline-none sm:p-5" onKeyDown={e=>{
   if(e.key==="Escape"&&!busy){e.stopPropagation();onCancel()}
   if(e.key==="Tab"){const items=box.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]');if(!items?.length){e.preventDefault();return}const first=items[0],last=items[items.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===box.current)){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===box.current)){e.preventDefault();first.focus()}}
  }}>
   <h2 id="followup-title" className="text-lg font-black">What happens next?</h2>
   <p id="followup-description" className="mt-1 text-sm text-black/70">This is a job reminder, not the whole job.</p>
   <p className="mt-2 break-words rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold">{task?.title||"Job follow-up"}</p>
   <fieldset disabled={busy} className="mt-3 space-y-2"><legend className="sr-only">Choose what happens next</legend>{choices.map(([value,title,description])=><label key={value} className={"flex cursor-pointer items-start gap-3 rounded-xl border p-3 "+(intent===value?"border-orange-500 bg-orange-50":"border-black/15 hover:bg-slate-50")}><input type="radio" name="followup-intent" value={value} checked={intent===value} onChange={()=>setIntent(value)} className="mt-1 h-4 w-4 shrink-0 accent-orange-600"/><span><span className="block text-sm font-black">{title}</span><span className="mt-0.5 block text-xs leading-relaxed text-black/65">{description}</span></span></label>)}</fieldset>
   {intent==="finish"&&<p className="mt-3 text-xs leading-relaxed text-black/65">No further follow-up needed. No new reminder is created. Follow-ups resume if someone changes the stage or sets a next action.</p>}
   {intent==="later"&&<fieldset disabled={busy} className="mt-4"><legend className="text-sm font-black">Remind me later</legend><div className="mt-2 flex flex-wrap gap-2">{REMINDER_DAYS.map(n=><button key={n} type="button" aria-pressed={days===n} onClick={()=>setDays(n)} className={"min-h-11 rounded-lg border px-3 text-sm font-bold "+(days===n?"border-orange-500 bg-orange-50":"border-black/20")}>{n===30?"1 month":n===14?"2 weeks":`${n} day${n===1?"":"s"}`}</button>)}</div><p className="mt-2 text-xs text-black/60">Moves the due date forward from its current date, or from now if overdue. Nothing is marked done.</p></fieldset>}
   {intent==="stage"&&<label className="mt-4 block text-sm font-black">Next action and stage<select disabled={busy} className={field} value={stage} onChange={e=>setStage(e.target.value)}><option value="">Choose the next step</option>{DONE_STAGES.map(([key,label,action])=><option key={key} value={key} disabled={key===task?.job_status}>{action} (stage: {label})</option>)}</select></label>}
   {needsDate&&<div className="mt-4"><label className="block text-sm font-black">{intent==="stage"?"Remind me to do this on":"Next reminder date"}<input disabled={busy} type="datetime-local" required className={field} value={at} onChange={e=>setAt(e.target.value)}/></label><div className="mt-2 flex flex-wrap gap-2">{[1,3,7,14].map(n=><button key={n} type="button" disabled={busy} className="min-h-11 rounded-lg border border-black/20 px-3 text-xs font-bold" onClick={()=>{const d=new Date();d.setDate(d.getDate()+n);d.setHours(9,0,0,0);setAt(local(d))}}>In {n} day{n===1?"":"s"}</button>)}</div>{reminderAt&&<p className="mt-2 text-xs font-bold text-black/70">Reminder: {reminderAt}</p>}{at&&!result.ok&&<p role="status" className="mt-2 text-xs font-bold text-red-700">{result.error}</p>}</div>}
   {intent==="stage"&&chosen&&<p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm leading-relaxed">Stage: <b>{chosen[1]}</b><br/>Next action: <b>{chosen[2]}</b><br/><span className="text-xs">This creates a reminder to do the action. It does not do it for you.</span></p>}
   <p className="mt-4 text-xs leading-relaxed text-black/60">No message or quote is sent, no payment is recorded and the whole job is not marked complete.</p>
   <div className="mt-4 flex flex-col-reverse gap-2 border-t border-black/10 pt-3 sm:flex-row sm:justify-end"><button type="button" disabled={busy} className="min-h-11 rounded-lg border border-black/20 px-4 text-sm font-black" onClick={onCancel}>Cancel</button><button type="button" disabled={!result.ok||busy} className="min-h-11 rounded-lg px-4 py-2 text-sm font-black text-white disabled:opacity-50" style={{backgroundColor:accent}} onClick={()=>{const current=completionRequest({intent,at,stage,days,currentStage:task?.job_status});if(current.ok)onConfirm(current.request)}}>{busy?"Saving...":button}</button></div>
  </div>
 </div>
}
