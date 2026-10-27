"use client";
import {useEffect,useMemo,useState} from "react";
import {BmsCard,BmsModal,BmsState,BmsInput,BmsSelect} from "./BmsUI";

type Item={id:number;label:string;amount:number|null;group:number};
const titleFromItem=(label:string)=>label.split("\n")[0].replace(/^\s*(?:item\s*|section\s*)?\d+[.)\-:]\s*/i,"").replace(/\s*[:=]?\s*\d+(?:\.\d+)?\s*[x×]\s*£\s*[\d,]+(?:\.\d{1,2})?\s*=\s*£\s*[\d,]+(?:\.\d{1,2})?.*$/i,"").replace(/\s*[:·-]?\s*£\s*[\d,]+(?:\.\d{1,2})?.*$/,"").replace(/[\s:·-]+$/,"").replace(/\b(?:approximately|approx\.?|about)\b.*$/i,"").replace(/[,;:]\s*(?:including|with|measuring|dimensions?|length|width|height)\b.*$/i,"").replace(/\b\d+(?:\.\d+)?\s*(?:mm|cm|metres?|meters?|m)\b.*$/i,"").replace(/[,;:\s-]+$/,"").trim().slice(0,75);
const formatQuantityOne=(value:string)=>value.replace(/\b1\s*[x×]\s*£\s*([\d,]+(?:\.\d{1,2})?)\s*=\s*£\s*[\d,]+(?:\.\d{1,2})?/gi,(_match,price)=>"£"+price);
const gbp=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(n);
function parseItems(scope:string,total:number):Item[]{
 const text=scope.replace(/<br\s*\/?\s*>/gi,"\n").replace(/\r\n/g,"\n");
 const lines=text.split("\n").map(x=>x.trim()).filter(Boolean);
 const numbered=/^(?:[-*•]\s*)?(?:\*\*)?(?:item\s*|section\s*)?(\d{1,2})\s*[.)\-:]\s*(.+)/i;
 const price=/£\s*([\d,]+(?:\.\d{1,2})?)/g;
 const groups:string[][]=[];
 const explicit=lines.filter(line=>numbered.test(line)).length>=2;
 if(explicit){
  for(const line of lines){if(numbered.test(line))groups.push([line]);else if(groups.length)groups[groups.length-1].push(line);}
 }else{
  // A priced line closes its quote item. Unpriced text preceding the next price
  // belongs to that NEXT item, not the previous priced item.
  let pending:string[]=[];
  for(const line of lines){
   pending.push(line);
   if(/£\s*[\d,]+(?:\.\d{1,2})?/.test(line)){groups.push(pending);pending=[];}
  }
  if(pending.length&&groups.length)groups[groups.length-1].push(...pending);
 }
 if(groups.length<2)return [];
 const parsed=groups.map((group,id)=>{
  const label=group.join("\n").trim();
  const prices=[...label.matchAll(price)].map(m=>Number(m[1].replace(/,/g,"")));
  return {id,label,amount:prices.length?prices[prices.length-1]:null,group:id};
 });
 return parsed;
}
export default function JobSplitPanel({reference,quotes}:{reference:string;quotes:any[]}){
  const quote=useMemo(()=>[...quotes].sort((a,b)=>new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime())[0],[quotes]);
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[review,setReview]=useState(false);
  const [error,setError]=useState(""),[items,setItems]=useState<Item[]>([]);
  const [names,setNames]=useState<string[]>([]),[amounts,setAmounts]=useState<string[]>([]);
  const [proceed,setProceed]=useState(0);
  const total=Number(quote?.amount||0);
  useEffect(()=>{if(new URLSearchParams(window.location.search).get("split")==="1"){setOpen(true);window.setTimeout(()=>document.getElementById("split-order-panel")?.scrollIntoView({behavior:"smooth",block:"start"}),120);}},[]);
  useEffect(()=>{if(!open)return;const parsed=parseItems(String(quote?.scope_text||quote?.scope||quote?.description||""),total);setItems(parsed.map((x,i)=>({...x,group:i===0?0:1})));setNames(["",""]);setAmounts(["",""]);},[open,quote,total]);
  const count=names.length;
  const changeCount=(next:number)=>{const n=Math.max(2,Math.min(30,next));setNames(v=>Array.from({length:n},(_,i)=>v[i]||""));setAmounts(v=>Array.from({length:n},(_,i)=>v[i]||""));setItems(v=>v.map(x=>({...x,group:Math.min(x.group,n-1)})));setProceed(v=>Math.min(v,n-1));};
  useEffect(()=>{if(!open||!items.length)return;setAmounts(names.map((_,i)=>String(Math.round(items.filter(x=>x.group===i).reduce((a,x)=>a+Number(x.amount||0),0)*100)/100)));},[items,names.length,open]);
  const groupItems=(i:number)=>items.filter(x=>x.group===i);
  const calculated=(i:number)=>groupItems(i).reduce((sum,x)=>sum+Number(x.amount||0),0);
  const parts=names.map((name,i)=>({scope:(name.trim()||"Order "+(i+1)),description:groupItems(i).map(x=>formatQuantityOne(x.label)).join("\n\n")||name.trim(),amount:Number(amounts[i]),disposition:i===proceed?"proceed":"on_hold"}));
  const valid=(!items.length||items.every(x=>x.amount!==null&&Number(x.amount)>=0))&&parts.length>=2&&parts.every(p=>p.scope.length>=2&&p.description&&p.amount>0)&&Math.abs(parts.reduce((a,p)=>a+p.amount,0)-total)<0.011&&(!items.length||items.every(x=>x.group>=0&&x.group<count))&&(!items.length||names.every((_,i)=>items.some(x=>x.group===i)));
  async function start(){setBusy(true);setError("");try{const r=await fetch("/api/admin/jobs/"+encodeURIComponent(reference)+"/split",{cache:"no-store"});const b=await r.json();if(!r.ok||!b.allowed)throw new Error(b.reason||b.error||"This job cannot be split");setOpen(true);}catch(e){setError(e instanceof Error?e.message:"Unable to check split eligibility");}finally{setBusy(false);}}
  async function submit(){setBusy(true);setError("");try{const r=await fetch("/api/admin/jobs/"+encodeURIComponent(reference)+"/split",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quoteId:quote.id,parts})});const b=await r.json();if(!r.ok)throw new Error(b.error||"Split failed");const next=(b.children||[]).find((x:any)=>x.disposition==="proceed")?.reference;window.location.assign(next?"/admin/jobs/"+encodeURIComponent(next):"/admin");}catch(e){setError(e instanceof Error?e.message:"Split failed");setReview(false);}finally{setBusy(false);}}
  return <section id="split-order-panel" className="mt-4 scroll-mt-24">
    {!open&&<button type="button" disabled={busy||!quote} onClick={()=>void start()} className="rounded-xl border border-[var(--bms-accent)] bg-white px-4 py-2.5 text-sm font-black text-[var(--bms-accent)] disabled:opacity-50">{busy?"Checking...":"Split job / order"}</button>}
    {error&&<BmsState kind="error" className="mt-2">{error}</BmsState>}
    {open&&<BmsCard className="mt-3 p-5">
      <h2 className="text-lg font-black">Split quoted order</h2>
      <p className="mt-1 text-sm text-black/60">Choose how many orders you need, then assign each quoted item to the correct order. Choose each order title from any quote item or type your own. Nothing is grouped automatically. Review the totals before confirming. The original quote is retained.</p>
      {items.length>0&&<label className="mt-4 block max-w-xs text-sm font-bold">Split into how many orders?<BmsSelect value={count} onChange={e=>changeCount(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3">{Array.from({length:Math.max(2,items.length)-1},(_,i)=>i+2).map(n=><option key={n} value={n}>{n} orders</option>)}</BmsSelect></label>}
      {!items.length&&<p className="mt-3 text-sm text-amber-800">No numbered quote items detected. Enter the separate orders manually below.</p>}
      {items.length>0&&<div className="mt-4 space-y-2">{items.map(x=><div key={x.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_130px_150px]"><p className="whitespace-pre-wrap text-sm">{x.id+1}. {formatQuantityOne(x.label)}</p><label className="text-xs font-bold">Item price £<BmsInput type="number" min="0" step="0.01" className="mt-1 w-full rounded border p-2" value={x.amount??""} onChange={e=>setItems(v=>v.map(y=>y.id===x.id?{...y,amount:e.target.value===""?null:Number(e.target.value)}:y))}/></label><label className="text-xs font-bold">Assign to order<BmsSelect className="mt-1 w-full rounded border p-2" value={x.group} onChange={e=>setItems(v=>v.map(y=>y.id===x.id?{...y,group:Number(e.target.value)}:y))}>{names.map((name,i)=><option key={i} value={i}>{name||"Order "+(i+1)}</option>)}</BmsSelect></label></div>)}</div>}
      <div className="mt-4 space-y-3">{names.map((name,i)=><div key={i} className="grid gap-2 rounded-lg bg-[#f5f5f2] p-3 sm:grid-cols-[1fr_130px_100px]"><label className="text-xs font-bold">Order name for order {i+1}<BmsSelect className="mt-1 w-full rounded border bg-white p-2" value={items.some(x=>titleFromItem(x.label)===name)?name:""} onChange={e=>setNames(v=>v.map((x,j)=>i===j?e.target.value:x))}><option value="">Custom title</option>{items.map(x=><option key={x.id} value={titleFromItem(x.label)}>{titleFromItem(x.label).slice(0,90)}</option>)}</BmsSelect><BmsInput placeholder="Or enter your own title" className="mt-1 w-full rounded border bg-white p-2" value={name} onChange={e=>setNames(v=>v.map((x,j)=>i===j?e.target.value:x))}/></label><label className="text-xs font-bold">Order total £<BmsInput type="number" min="0.01" step="0.01" className="mt-1 w-full rounded border bg-white p-2" value={amounts[i]} onChange={e=>setAmounts(v=>v.map((x,j)=>i===j?e.target.value:x))}/>{items.length>0&&<button type="button" className="mt-1 text-xs underline" onClick={()=>setAmounts(v=>v.map((x,j)=>i===j?String(Math.round(calculated(i)*100)/100):x))}>Use item sum {gbp(calculated(i))}</button>}</label><label className="flex items-center gap-2 text-xs font-bold"><input type="radio" checked={proceed===i} onChange={()=>setProceed(i)}/> Work on this order now</label></div>)}</div>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>changeCount(count+1)} className="rounded-lg border px-3 py-2 text-sm font-bold">+ Add order</button>{count>2&&<button type="button" onClick={()=>changeCount(count-1)} className="rounded-lg border px-3 py-2 text-sm">Remove last order</button>}</div>
      <p className="mt-4 text-sm font-bold">Original quote: {gbp(total)}. Split total: {gbp(parts.reduce((a,p)=>a+p.amount,0))}</p>
      {!valid&&<p className="mt-1 text-xs text-amber-800">Check every item price and assign each item to an order. Each order needs a positive total, and all totals must equal the original quote.</p>}
      <div className="mt-3 flex gap-2"><button type="button" disabled={!valid||busy} onClick={()=>setReview(true)} className="rounded-xl bg-[var(--bms-accent)] px-4 py-2 text-sm font-black text-white disabled:opacity-40">Review split</button><button type="button" onClick={()=>{setOpen(false);setError("");}} className="rounded-xl border px-4 py-2 text-sm">Cancel</button></div>
    </BmsCard>}
    {review&&<BmsModal title="Confirm order split" onClose={()=>{if(!busy)setReview(false)}} className="max-w-lg"><p className="mt-2 text-sm">The original job and quote will be archived. Separate jobs and editable draft quotes will be created. One order will be marked for work now; all other orders will also be created separately, awaiting work. No customer messages will be sent.</p>{parts.map((p,i)=><div key={i} className="mt-3 rounded-lg bg-[#f5f5f2] p-3"><strong>{p.scope} · {gbp(p.amount)}</strong><p className="text-xs">{p.disposition==="proceed"?"Active order: work starts now":"Separate order created: awaiting work"}</p><p className="mt-2 whitespace-pre-wrap text-xs">{p.description}</p></div>)}<div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={()=>void submit()} className="rounded-lg bg-[var(--bms-accent)] px-4 py-2 font-black text-white">{busy?"Splitting...":"Confirm split"}</button><button type="button" disabled={busy} onClick={()=>setReview(false)} className="rounded-lg border px-4 py-2">Back</button></div></BmsModal>}
  </section>;
}
