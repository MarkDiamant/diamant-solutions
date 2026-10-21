"use client";
import {useEffect,useMemo,useState} from "react";

type Item={id:number;label:string;amount:number|null;group:number};
const gbp=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(n);
function parseItems(scope:string,total:number):Item[]{
  const lines=scope.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const numbered=/^(?:item\s*)?(\d{1,2})\s*[.)\-:]\s+(.+)/i;
  const items:{label:string;amount:number|null}[]=[];
  for(const line of lines){
    const match=line.match(numbered);
    if(match){items.push({label:match[2],amount:null});continue;}
    if(items.length)items[items.length-1].label+="\n"+line;
  }
  if(items.length<2){
    const sections=scope.split(/(?<=\.)\s+(?=\d{1,2}[.)]\s)/).map(x=>x.trim()).filter(Boolean);
    if(sections.length>=2)return sections.map((label,id)=>({id,label,amount:null,group:id}));
    return [];
  }
  const result=items.map((x,id)=>{
    const prices=[...x.label.matchAll(/£\s*([\d,]+(?:\.\d{1,2})?)/g)].map(m=>Number(m[1].replace(/,/g,"")));
    const amount=prices.length?prices[prices.length-1]:null;
    return {id,label:x.label,amount,group:id};
  });
  const priced=result.reduce((sum,x)=>sum+(x.amount||0),0);
  if(result.some(x=>x.amount===null)&&priced<total){
    const missing=result.filter(x=>x.amount===null);
    const each=Math.round((total-priced)/missing.length*100)/100;
    missing.forEach((x,i)=>x.amount=i===missing.length-1?Math.round((total-priced-each*(missing.length-1))*100)/100:each);
  }
  return result;
}
export default function JobSplitPanel({reference,quotes}:{reference:string;quotes:any[]}){
  const quote=useMemo(()=>[...quotes].sort((a,b)=>new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime())[0],[quotes]);
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[review,setReview]=useState(false);
  const [error,setError]=useState(""),[items,setItems]=useState<Item[]>([]);
  const [names,setNames]=useState<string[]>([]),[amounts,setAmounts]=useState<string[]>([]);
  const [proceed,setProceed]=useState(0);
  const total=Number(quote?.amount||0);
  useEffect(()=>{if(!open)return;const parsed=parseItems(String(quote?.scope_text||""),total);setItems(parsed);setNames(parsed.length?parsed.map((x,i)=>"Order "+(i+1)):["Order 1","Order 2"]);setAmounts(parsed.length?parsed.map(x=>String(x.amount??"")):["",""]);},[open,quote,total]);
  const count=names.length;
  const groupItems=(i:number)=>items.filter(x=>x.group===i);
  const calculated=(i:number)=>groupItems(i).reduce((sum,x)=>sum+Number(x.amount||0),0);
  const parts=names.map((name,i)=>({scope:name.trim(),description:groupItems(i).map(x=>x.label).join("\n\n")||name.trim(),amount:Number(amounts[i]),disposition:i===proceed?"proceed":"on_hold"}));
  const valid=parts.length>=2&&parts.every(p=>p.scope.length>=2&&p.description&&p.amount>0)&&Math.abs(parts.reduce((a,p)=>a+p.amount,0)-total)<0.011&&(!items.length||items.every(x=>x.group>=0&&x.group<count));
  async function start(){setBusy(true);setError("");try{const r=await fetch("/api/admin/jobs/"+encodeURIComponent(reference)+"/split",{cache:"no-store"});const b=await r.json();if(!r.ok||!b.allowed)throw new Error(b.reason||b.error||"This job cannot be split");setOpen(true);}catch(e){setError(e instanceof Error?e.message:"Unable to check split eligibility");}finally{setBusy(false);}}
  async function submit(){setBusy(true);setError("");try{const r=await fetch("/api/admin/jobs/"+encodeURIComponent(reference)+"/split",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quoteId:quote.id,parts})});const b=await r.json();if(!r.ok)throw new Error(b.error||"Split failed");const next=(b.children||[]).find((x:any)=>x.disposition==="proceed")?.reference;window.location.assign(next?"/admin/jobs/"+encodeURIComponent(next):"/admin");}catch(e){setError(e instanceof Error?e.message:"Split failed");setReview(false);}finally{setBusy(false);}}
  return <section className="mt-4">
    {!open&&<button type="button" disabled={busy||!quote} onClick={()=>void start()} className="rounded-xl border border-[#e66a24] bg-white px-4 py-2.5 text-sm font-black text-[#e66a24] disabled:opacity-50">{busy?"Checking...":"Split job / order"}</button>}
    {error&&<p role="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
    {open&&<div className="mt-3 rounded-2xl border border-orange-200 bg-white p-5">
      <h2 className="text-lg font-black">Split quoted order</h2>
      <p className="mt-1 text-sm text-black/60">Numbered quote items are separated automatically. Choose which items belong to each order, edit the prices, and review before confirming. The original quote is retained.</p>
      {!items.length&&<p className="mt-3 text-sm text-amber-800">No numbered quote items detected. Enter the separate orders manually below.</p>}
      {items.length>0&&<div className="mt-4 space-y-2">{items.map(x=><div key={x.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_130px_150px]"><p className="whitespace-pre-wrap text-sm">{x.id+1}. {x.label}</p><label className="text-xs font-bold">Item price £<input type="number" min="0" step="0.01" className="mt-1 w-full rounded border p-2" value={x.amount??""} onChange={e=>setItems(v=>v.map(y=>y.id===x.id?{...y,amount:e.target.value===""?null:Number(e.target.value)}:y))}/></label><label className="text-xs font-bold">Assign to order<select className="mt-1 w-full rounded border p-2" value={x.group} onChange={e=>setItems(v=>v.map(y=>y.id===x.id?{...y,group:Number(e.target.value)}:y))}>{names.map((name,i)=><option key={i} value={i}>{name||"Order "+(i+1)}</option>)}</select></label></div>)}</div>}
      <div className="mt-4 space-y-3">{names.map((name,i)=><div key={i} className="grid gap-2 rounded-lg bg-[#f5f5f2] p-3 sm:grid-cols-[1fr_130px_100px]"><label className="text-xs font-bold">Order name<input className="mt-1 w-full rounded border bg-white p-2" value={name} onChange={e=>setNames(v=>v.map((x,j)=>i===j?e.target.value:x))}/></label><label className="text-xs font-bold">Order total £<input type="number" min="0.01" step="0.01" className="mt-1 w-full rounded border bg-white p-2" value={amounts[i]} onChange={e=>setAmounts(v=>v.map((x,j)=>i===j?e.target.value:x))}/>{items.length>0&&<button type="button" className="mt-1 text-xs underline" onClick={()=>setAmounts(v=>v.map((x,j)=>i===j?String(Math.round(calculated(i)*100)/100):x))}>Use item sum {gbp(calculated(i))}</button>}</label><label className="flex items-center gap-2 text-xs font-bold"><input type="radio" checked={proceed===i} onChange={()=>setProceed(i)}/> Proceed</label></div>)}</div>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>{setNames(v=>[...v,"Order "+(v.length+1)]);setAmounts(v=>[...v,""]);}} className="rounded-lg border px-3 py-2 text-sm font-bold">+ Add order</button>{count>2&&<button type="button" onClick={()=>{setItems(v=>v.map(x=>x.group===count-1?{...x,group:count-2}:x));setNames(v=>v.slice(0,-1));setAmounts(v=>v.slice(0,-1));setProceed(v=>Math.min(v,count-2));}} className="rounded-lg border px-3 py-2 text-sm">Remove last order</button>}</div>
      <p className="mt-4 text-sm font-bold">Original quote: {gbp(total)}. Split total: {gbp(parts.reduce((a,p)=>a+p.amount,0))}</p>
      {!valid&&<p className="mt-1 text-xs text-amber-800">Enter at least two orders with positive prices. Their total must equal the original quote.</p>}
      <div className="mt-3 flex gap-2"><button type="button" disabled={!valid||busy} onClick={()=>setReview(true)} className="rounded-xl bg-[#e66a24] px-4 py-2 text-sm font-black text-white disabled:opacity-40">Review split</button><button type="button" onClick={()=>{setOpen(false);setError("");}} className="rounded-xl border px-4 py-2 text-sm">Cancel</button></div>
    </div>}
    {review&&<div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/60 p-3"><div role="dialog" aria-modal="true" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5"><h2 className="text-xl font-black">Confirm order split</h2><p className="mt-2 text-sm">The original job and quote will be archived. Separate jobs and editable draft quotes will be created. No customer messages will be sent.</p>{parts.map((p,i)=><div key={i} className="mt-3 rounded-lg bg-[#f5f5f2] p-3"><strong>{p.scope} · {gbp(p.amount)}</strong><p className="text-xs">{p.disposition==="proceed"?"Proceeding":"On hold"}</p><p className="mt-2 whitespace-pre-wrap text-xs">{p.description}</p></div>)}<div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={()=>void submit()} className="rounded-lg bg-[#e66a24] px-4 py-2 font-black text-white">{busy?"Splitting...":"Confirm split"}</button><button type="button" disabled={busy} onClick={()=>setReview(false)} className="rounded-lg border px-4 py-2">Back</button></div></div></div>}
  </section>;
}
