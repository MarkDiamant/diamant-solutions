"use client";
import {useEffect,useMemo,useState} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";

type Movement={id:string;product:string;delta:number;reason:string;when:string};
type DemoState={onHand:number;reserved:number;incoming:number;received:number;picked:number;used:number;returned:number;orderStatus:string;deliveryStatus:string;fittingStatus:string;movements:Movement[]};
const initial:DemoState={onHand:30,reserved:12,incoming:12,received:8,picked:0,used:0,returned:0,orderStatus:"Partially allocated",deliveryStatus:"Awaiting picking",fittingStatus:"Scheduled",movements:[{id:"opening",product:"Oak laminate 8mm",delta:30,reason:"Opening warehouse stock",when:"Demo setup"}]};
const money=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(n);
const sampleNames:Record<string,string>={flooring:"Oak & Stone Flooring",northstar:"Northstar Property & Projects",electrical:"BrightSpark Electrical",insurance:"Insurance",studio:"Creative Agency",consultancy:"Consultancy",distribution:"Atlas Distribution"};
const sampleProducts:Record<string,{name:string;unit:string;cost:number;price:number;stock:boolean}[]>={flooring:[{name:"Oak laminate 8mm",unit:"pack (2.2 m²)",cost:24,price:39,stock:true},{name:"Oak LVT click",unit:"pack (2.5 m²)",cost:32,price:49,stock:true},{name:"Porcelain grey tile",unit:"box",cost:18,price:31,stock:true},{name:"Foam underlay",unit:"roll",cost:12,price:21,stock:true}],northstar:[{name:"Boiler circulation pump",unit:"each",cost:95,price:145,stock:true}],electrical:[{name:"Consumer unit",unit:"each",cost:82,price:139,stock:true}],insurance:[{name:"Policy administration",unit:"service",cost:35,price:70,stock:false}],studio:[{name:"A4 brochure print",unit:"each",cost:1.8,price:4,stock:false}],consultancy:[{name:"Consultancy workshop",unit:"day",cost:480,price:800,stock:false}],distribution:[{name:"Pallet",unit:"each",cost:9.5,price:17,stock:true}]};
export default function DemoOperationsPanel(){
 const sample=useSearchParams().get("sample")||"flooring",flooring=sample==="flooring",key="bms-demo-operations-"+sample;
 const [state,setState]=useState<DemoState>(initial),[ready,setReady]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{try{const raw=sessionStorage.getItem(key);if(raw){const value=JSON.parse(raw);if(value&&typeof value.onHand==="number"&&Array.isArray(value.movements))setState(value);}}catch{}setReady(true);},[key]);
 useEffect(()=>{if(ready)try{sessionStorage.setItem(key,JSON.stringify(state));}catch{}},[state,ready,key]);
 const products=sampleProducts[sample]||sampleProducts.northstar;
 const remaining=24-state.picked,available=state.onHand-state.reserved;
 const add=(action:"receive"|"reserve"|"pick"|"use"|"return")=>{
  setState(current=>{
   const next={...current,movements:[...current.movements]};
   let delta=0,reason="";
   if(action==="receive"){if(current.incoming<12){setMessage("The purchase order is already fully received.");return current;}delta=12;next.onHand+=12;next.incoming=0;next.received=20;reason="Goods received: PO-1001, 12 laminate packs";}
   if(action==="reserve"){if(current.picked||current.reserved>=24||current.onHand-current.reserved<12){setMessage("Not enough available stock to reserve.");return current;}next.reserved+=12;next.orderStatus="Fully allocated";reason="Reserved 12 additional packs for SO-2001";}
   if(action==="pick"){if(current.reserved<24||current.picked){setMessage("Reserve the full order before picking.");return current;}delta=-24;next.onHand-=24;next.reserved-=24;next.picked=24;next.orderStatus="Picked";next.deliveryStatus="Ready for delivery";reason="Warehouse picking: 24 packs for SO-2001";}
   if(action==="use"){if(current.picked!==24||current.used){setMessage("Pick and deliver the order before recording fitting.");return current;}next.used=22;next.fittingStatus="Materials used: 22 packs";next.deliveryStatus="Delivered";reason="Fitter confirmed 22 packs used on site";}
   if(action==="return"){if(current.used!==22||current.returned){setMessage("Record actual materials used before returning leftovers.");return current;}delta=2;next.onHand+=2;next.returned=2;next.fittingStatus="Completed: 2 unused packs returned";next.orderStatus="Fulfilled";reason="Warehouse accepted 2 unused packs in good condition";}
   next.movements.push({id:action+"-"+current.movements.length,product:"Oak laminate 8mm",delta,reason,when:new Date().toLocaleTimeString("en-GB")});return next;
  });
  setMessage("Demo workflow updated. No real stock or financial records were changed.");
 };
 return <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 text-slate-900">
  <header className="rounded-2xl bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">{sampleNames[sample]||"Business"} operations demo</h1><p className="mt-1 text-sm text-slate-600">Fictional, isolated workflows. Changes stay in this browser session.</p></div><Link href="/" className="rounded-lg border px-3 py-2 text-sm font-semibold">Dashboard</Link></div></header>
  {message&&<p role="status" className="rounded-lg bg-white p-3 text-sm">{message}</p>}
  <section className="rounded-2xl bg-white p-5"><h2 className="text-lg font-bold">Central product catalogue</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Product</th><th className="p-2">Unit</th><th className="p-2">Supplier cost</th><th className="p-2">Standard price</th><th className="p-2">Stock controlled</th></tr></thead><tbody>{products.map(p=><tr key={p.name} className="border-t"><td className="p-2">{p.name}</td><td className="p-2">{p.unit}</td><td className="p-2">{money(p.cost)}</td><td className="p-2">{money(p.price)}</td><td className="p-2">{p.stock?"Yes":"No"}</td></tr>)}</tbody></table></div></section>
  {flooring&&<>
  <div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl bg-white p-5"><div className="text-xs text-slate-500">Laminate stock on hand</div><div className="text-3xl font-bold">{state.onHand} packs</div><p className="text-sm">Reserved: {state.reserved} · Available: {available}</p></div><div className="rounded-2xl bg-white p-5"><div className="text-xs text-slate-500">Supplier order PO-1001</div><div className="text-3xl font-bold">{state.received}/20</div><p className="text-sm">Received / ordered packs · {state.incoming} incoming</p></div><div className="rounded-2xl bg-white p-5"><div className="text-xs text-slate-500">Customer balance</div><div className="text-3xl font-bold">{money(488)}</div><p className="text-sm">Invoice £888 · Verified demo receipt £400</p></div></div>
  <section className="rounded-2xl bg-white p-5"><h2 className="text-lg font-bold">Connected flooring job: <Link href="/jobs/FL001" className="underline">FL001</Link></h2><p className="mt-2 text-sm">Customer: Sarah Collins · Supply and fit · 48 m² laminate with 10% wastage · 2.2 m² per pack · 24 packs required (rounded up)</p><p className="mt-2 text-sm">Customer-specific price: £37 per pack, compared with £39 standard · Sales order SO-2001 · Total £888</p><p className="mt-2 text-sm">Sales order: {state.orderStatus} · Delivery: {state.deliveryStatus} · Fitting: {state.fittingStatus}</p>
   <div className="mt-4 flex flex-wrap gap-2">{[["Receive remaining 12 packs","receive"],["Reserve remaining 12 packs","reserve"],["Pick 24 packs","pick"],["Record 22 packs used","use"],["Accept 2 returned packs","return"]].map(([label,action])=><button key={action} type="button" onClick={()=>add(action as "receive"|"reserve"|"pick"|"use"|"return")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100">{label}</button>)}<button type="button" onClick={()=>{setState(initial);setMessage("Demo reset.");}} className="rounded-lg border px-3 py-2 text-sm">Reset demo</button></div>
  </section>
  <section className="rounded-2xl bg-white p-5"><h2 className="text-lg font-bold">Stock audit trail</h2><div className="mt-3 space-y-2">{state.movements.map(m=><div key={m.id} className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm"><span>{m.reason}</span><span className="font-semibold">{m.delta>0?"+":""}{m.delta} packs · {m.when}</span></div>)}</div><p className="mt-3 text-xs text-slate-500">Reservations do not alter stock on hand. Picking reduces stock on hand. Unused materials become available only after warehouse acceptance.</p></section>
  </>}
 </main>;
}
