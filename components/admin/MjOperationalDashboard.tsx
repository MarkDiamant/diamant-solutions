"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase-browser";
const TENANT="3ebc2265-8842-4826-b464-71783d6cf841";
const money=(v:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(v);
export default function MjOperationalDashboard(){
 const [token,setToken]=useState(""),[data,setData]=useState<Record<string,any[]>>({}),[error,setError]=useState("");
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setToken(data.session?.access_token||""));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setToken(s?.access_token||""));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!token)return;let active=true;Promise.all(["jobs","customers","payments","costs","quotes","invoices"].map(async resource=>{const response=await fetch("/api/business-software/tenant-data?"+new URLSearchParams({tenant_id:TENANT,resource}),{headers:{Authorization:"Bearer "+token},cache:"no-store"});const body=await response.json();if(!response.ok)throw Error(body.error||"Unable to load "+resource);return [resource,body.data]})).then(all=>{if(active)setData(Object.fromEntries(all))}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[token]);
 const jobs=data.jobs||[],payments=data.payments||[],costs=data.costs||[];
 const received=payments.filter(p=>p.direction==="customer_in").reduce((n,p)=>n+Number(p.amount||0),0);
 const contractorPaid=payments.filter(p=>p.direction==="subcontractor_out").reduce((n,p)=>n+Number(p.amount||0),0);
 const actualCosts=costs.reduce((n,c)=>n+Number(c.actual_amount||0),0);
 return <main className="mx-auto max-w-6xl p-6"><h1 className="text-3xl font-black">M&J management</h1><p className="mt-1 text-sm">Shared BMS · Isolated staging · Not live</p>{error&&<p className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{!token&&<p className="mt-5"><Link href="/bms-mj-preview" className="underline">Sign in to M&J staging</Link></p>}
 <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["Customers",(data.customers||[]).length],["Jobs",jobs.length],["Customer receipts",money(received)],["Contractor payments",money(contractorPaid)],["Recorded actual costs",money(actualCosts)],["Cash after contractor payments",money(received-contractorPaid)]].map(([label,value])=><div key={String(label)} className="rounded-xl border bg-white p-5"><p className="text-sm text-black/60">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>)}</div>
 <p className="mt-4 text-xs text-black/60">Cash after contractor payments is not profit: other job costs, overheads, VAT and outstanding amounts may apply. Figures reflect recorded staging transactions.</p>
 <nav className="mt-6 flex flex-wrap gap-2">{["jobs","customers","quotes","invoices","payments","files","team"].map(v=><Link key={v} className="rounded-lg bg-[#e66a24] px-4 py-3 text-sm font-bold capitalize text-white" href={"/bms-runtime/"+v}>{v}</Link>)}<Link className="rounded-lg border bg-white px-4 py-3 text-sm font-bold" href="/bms-runtime/jobs/new">+ New job</Link></nav>
 <section className="mt-8 rounded-xl border bg-white p-5"><h2 className="text-xl font-black">Recent jobs</h2>{jobs.slice(0,12).map(j=><Link className="mt-3 flex flex-wrap justify-between gap-3 border-t pt-3" key={j.id} href={"/bms-runtime/jobs/"+j.reference}><span className="font-bold">{j.reference} · {j.job_type}</span><span>{j.status}</span></Link>)}</section></main>;
}
