"use client";
import {useEffect,useState} from "react";
import {BmsCard,BmsState} from "./BmsUI";
type Summary={used_net:number;received_net:number;order_count:number;lines:{name:string;used_qty:number;cost_net:number}[]};
export default function JobMaterialsProfit({reference,quotedGrossProfit,existingCosts}:{reference:string;quotedGrossProfit:number;existingCosts:{category?:string;actual_amount?:number;estimated_amount?:number}[]}){
 const [summary,setSummary]=useState<Summary|null>(null),[error,setError]=useState("");
 useEffect(()=>{let live=true;setSummary(null);setError("");fetch("/api/bms-materials?job_reference="+encodeURIComponent(reference),{cache:"no-store"}).then(async r=>{const v=await r.json();if(!r.ok)throw Error(v.error||"Unable to load job materials");if(live)setSummary(v)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[reference]);
 const money=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(n);
 const recorded=existingCosts.filter(c=>/material|suppl|stock|purchase/i.test(String(c.category||""))).reduce((sum,c)=>sum+Number(c.actual_amount??c.estimated_amount??0),0);
 if(error){if(/fictional demo|production actions are unavailable/i.test(error))return null;return <BmsState kind="error">Material costs could not be loaded. Try again later.</BmsState>;}
 if(!summary)return <BmsState kind="loading">Loading material usage and profitability…</BmsState>;
 const used=Number(summary.used_net)||0,overlap=recorded>0&&used>0;
 return <div className="my-5 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Job materials profitability">
 <h3 className="font-bold">Material costs</h3>
 <p className="mt-2 text-sm">Materials used on this job: <strong>{money(used)}</strong> ex VAT</p>
 <p className="text-sm">Already recorded in job costs: <strong>{money(recorded)}</strong></p>
 {overlap?<p className="mt-2 text-sm font-bold text-amber-800">Potential duplicate materials costs. Review existing job costs before adjusting profit. No extra deduction has been applied.</p>:<p className="mt-2 text-sm font-bold">Estimated profit after material usage: {money(quotedGrossProfit-used)}</p>}
 <p className="mt-2 text-xs text-black/55">Material costs come from Purchasing & Stock. Avoid entering the same cost twice.</p>
 </div>;
}
