"use client";
import {useEffect,useState} from "react";
type Row={id:string;name:string;quantity:number;received_qty:number;used_qty:number;stock_qty:number;waste_qty:number;returned_qty:number;status:string};
export default function MaterialReceiving({orderId}:{orderId:string}){
 const [lines,setLines]=useState<Row[]>([]),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[qty,setQty]=useState<Record<string,string>>({}),[usage,setUsage]=useState<Record<string,string>>({});
 const refresh=async()=>{const r=await fetch("/api/bms-materials?order="+encodeURIComponent(orderId),{cache:"no-store"});const v=await r.json();if(!r.ok)throw Error(v.error||"Unable to load");setLines(v.lines||[])};
 useEffect(()=>{if(orderId)refresh().catch(e=>setMsg(String(e)))},[orderId]);
 const send=async(x:any)=>{setBusy(true);setMsg("");try{const r=await fetch("/api/bms-materials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(x)});const v=await r.json();if(!r.ok)throw Error(v.error||"Unable to save");await refresh();setMsg("Updated successfully")}catch(e){setMsg(e instanceof Error?e.message:"Unable to save")}finally{setBusy(false)}};
 return <section style={{marginTop:24,borderTop:"1px solid #ddd",paddingTop:16}}>
 <h2>Receive & allocate materials</h2><p>Received materials default to 100% used on the job. Adjust usage only when necessary.</p>
 {msg&&<p role="status">{msg}</p>}
 {lines.map(line=>{const received=Number(line.received_qty||0),used=Number(line.used_qty||0),stock=Number(line.stock_qty||0),waste=Number(line.waste_qty||0),returned=Number(line.returned_qty||0);const requested=Number(usage[line.id]??used);const remaining=received-requested-waste-returned;return <article key={line.id} style={{border:"1px solid #ddd",borderRadius:12,padding:12,marginBottom:12}}>
 <strong>{line.name}</strong><p>Ordered {line.quantity} · Received {received} · Used {used} · Stock {stock} · Waste {waste} · Supplier returns {returned}</p>
 {line.status!=="draft"&&received<Number(line.quantity)&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><label>Receive quantity <input type="number" min="0.001" step="any" value={qty[line.id]??String(Number(line.quantity)-received)} onChange={e=>setQty(v=>({...v,[line.id]:e.target.value}))}/></label><button disabled={busy} onClick={()=>send({action:"receive",line_id:line.id,quantity:Number(qty[line.id]??Number(line.quantity)-received)})}>Confirm receipt</button></div>}
 {received>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"end"}}><label>Used on job <input type="number" min="0" max={received} step="any" value={usage[line.id]??String(used)} onChange={e=>setUsage(v=>({...v,[line.id]:e.target.value}))}/></label><button disabled={busy||requested<0||remaining<0} onClick={()=>send({action:"allocate",line_id:line.id,used:requested,stock:remaining,waste,returned})}>Move unused to stock</button></div>}
 </article>})}
 </section>;
}
