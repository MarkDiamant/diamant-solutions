"use client";
import {useEffect,useState} from "react";
import {BmsCard,BmsInput,BmsSelect} from "../BmsUI";
type Row={id:string;name:string;quantity:number;received_qty:number;used_qty:number;stock_qty:number;waste_qty:number;returned_qty:number;status:string;cost_net:number};
type Location={id:string;name:string;is_default:boolean};type Job={id:string;reference:string};
export default function MaterialReceiving({orderId}:{orderId:string}){
const [lines,setLines]=useState<Row[]>([]),[locations,setLocations]=useState<Location[]>([]),[jobs,setJobs]=useState<Job[]>([]),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[qty,setQty]=useState<Record<string,string>>({}),[chosen,setChosen]=useState<Record<string,string>>({}),[job,setJob]=useState<Record<string,string>>({}),[defaultLocation,setDefaultLocation]=useState("");
const refresh=async()=>{const r=await fetch("/api/bms-materials?order="+encodeURIComponent(orderId),{cache:"no-store"});const v=await r.json();if(!r.ok)throw Error(v.error||"Unable to load");setLines(v.lines||[]);setLocations(v.locations||[]);setJobs(v.jobs||[]);const preferred=(v.locations||[]).find((l:Location)=>l.is_default)||(v.locations||[])[0];if(preferred)setDefaultLocation(preferred.id)};
useEffect(()=>{if(orderId)refresh().catch(e=>setMsg(String(e)))},[orderId]);
const send=async(x:Record<string,unknown>)=>{setBusy(true);setMsg("");try{const r=await fetch("/api/bms-materials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(x)});const v=await r.json();if(!r.ok)throw Error(v.error||"Unable to save");await refresh();setMsg("Receipt and inventory updated together.")}catch(e){setMsg(e instanceof Error?e.message:"Unable to save")}finally{setBusy(false)}};
return <BmsCard className="bms-materials-panel bms-materials-receiving">
<h2 className="bms-materials-panel-title">Goods received</h2><p className="bms-materials-muted">Confirm delivery to your default stock location, choose a different location for any item, or issue it directly to a job. Inventory and job costing update in one transaction.</p>
{msg&&<p role="status">{msg}</p>}
<div className="bms-materials-receipt-fields"><label>Default location for this delivery<BmsSelect value={defaultLocation} onChange={e=>setDefaultLocation(e.target.value)}><option value="">Choose location</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}{l.is_default?" (default)":""}</option>)}</BmsSelect></label></div>
{!locations.length&&<p role="alert">Add an active stock location in Stock before receiving materials.</p>}
{lines.map(line=>{const received=Number(line.received_qty||0),remaining=Math.max(0,Number(line.quantity)-received);return <article className="bms-materials-receipt-row" key={line.id}>
<strong>{line.name}</strong><p>Ordered {line.quantity} · Received {received} · Remaining {remaining}</p>
{line.status!=="draft"&&remaining>0&&<div className="bms-materials-receipt-fields">
<label>Quantity received<BmsInput type="number" min="0.001" step="any" value={qty[line.id]??String(remaining)} onChange={e=>setQty(v=>({...v,[line.id]:e.target.value}))}/></label>
<label>Stock location<BmsSelect value={chosen[line.id]||defaultLocation} onChange={e=>setChosen(v=>({...v,[line.id]:e.target.value}))}><option value="">Choose location</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</BmsSelect></label>
<label>Destination<BmsSelect value={job[line.id]||""} onChange={e=>setJob(v=>({...v,[line.id]:e.target.value}))}><option value="">Into inventory</option>{jobs.map(j=><option key={j.id} value={j.id}>Direct to job: {j.reference}</option>)}</BmsSelect></label>
<button className="bms-primary" disabled={busy||!locations.length||!(Number(qty[line.id]??remaining)>0)||Number(qty[line.id]??remaining)>remaining||!(chosen[line.id]||defaultLocation)} onClick={()=>send({action:"receive",line_id:line.id,quantity:Number(qty[line.id]??remaining),request_id:crypto.randomUUID(),location_id:chosen[line.id]||defaultLocation,job_id:job[line.id]||null})}>{busy?"Recording…":"Confirm receipt"}</button>
</div>}
{received>0&&<p className="bms-materials-muted">Previously recorded: {received}. Historic allocations remain unchanged. Use Stock for new job picking and returns.</p>}
</article>})}
</BmsCard>;
}
