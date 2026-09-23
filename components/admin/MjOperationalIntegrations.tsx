"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase-browser";
export default function MjOperationalIntegrations(){
 const [token,setToken]=useState(""),[status,setStatus]=useState<any>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setToken(data.session?.access_token||""));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setToken(s?.access_token||""));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!token)return;fetch("/api/business-software/staging-xero-status",{headers:{Authorization:"Bearer "+token},cache:"no-store"}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error);setStatus(b)}).catch(e=>setError(e.message))},[token]);
 async function connect(){setBusy(true);setError("");try{const r=await fetch("/api/business-software/staging-xero",{method:"POST",headers:{Authorization:"Bearer "+token}});const b=await r.json();if(!r.ok)throw Error(b.error);location.assign(b.url)}catch(e:any){setError(e.message);setBusy(false)}}
 return <main className="mx-auto max-w-3xl p-6"><Link href="/bms-runtime" className="underline">← M&J dashboard</Link><h1 className="my-5 text-3xl font-black">M&J integrations</h1><p>Isolated staging only</p>{error&&<p role="alert" className="my-4 bg-red-50 p-3 text-red-700">{error}</p>}{!token?<Link href="/bms-mj-preview" className="underline">Sign in to staging</Link>:<section className="mt-5 rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Xero</h2><p>Status: {status?.connected?"Connected":status?.status||"Checking…"}</p>{status?.organisation&&<p>Organisation: {status.organisation}</p>}{!status?.connected&&<button disabled={busy} onClick={connect} className="mt-4 rounded-lg bg-[#e66a24] px-4 py-2 text-white">Authorise M&J Xero</button>}</section>}</main>;
}
