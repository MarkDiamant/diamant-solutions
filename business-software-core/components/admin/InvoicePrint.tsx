"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_CRM_CONFIG } from "@/lib/crm/config";

function money(value:any){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(value||0));}

export default function InvoicePrint({reference,invoiceId}:{reference:string;invoiceId:string}){
 const[data,setData]=useState<any>(null),[error,setError]=useState("");const[crmConfig,setCrmConfig]=useState(DEFAULT_CRM_CONFIG);
 useEffect(()=>{fetch("/api/admin/settings",{cache:"no-store"}).then(async r=>{if(r.ok){const b=await r.json();if(b.settings)setCrmConfig(b.settings)}}).catch(()=>{});fetch(`/api/admin/jobs/${encodeURIComponent(reference)}`,{cache:"no-store"}).then(async r=>{if(r.status===401){location.href="/admin/login";return}const b=await r.json();if(!r.ok)setError(b.error||"Could not load invoice");else setData(b)}).catch(()=>setError("Could not load invoice"));},[reference]);
 const invoice=useMemo(()=>data?.invoices?.find((x:any)=>String(x.id)===String(invoiceId)),[data,invoiceId]);
 if(error)return <main className="p-10">{error}</main>;if(!data)return <main className="p-10">Loading invoice...</main>;if(!invoice)return <main className="p-10">Invoice not found.</main>;
 const j=data.job||{},c=data.customer||{},name=[c.first_name,c.last_name].filter(Boolean).join(" ")||"Customer",site=[j.site_address_line_1||c.address_line_1,j.site_address_line_2||c.address_line_2,j.site_city||c.city,j.site_postcode||c.postcode].filter(Boolean).join(", "),amount=invoice.total??invoice.amount_due??j.quoted_amount??0,brand=crmConfig.accentColour||"#1f4f78",logo=crmConfig.logoUrl?(String(crmConfig.logoUrl).startsWith("/")?crmConfig.logoUrl:"/api/business-software/tenant-logo"):"";
 return <main className="min-h-screen bg-[#ecece8] py-6 text-[#171717]" style={{"--brand":brand} as React.CSSProperties}>
  <div className="mx-auto mb-4 flex max-w-[900px] justify-end gap-2 px-4"><button onClick={()=>window.print()} className="rounded-xl bg-[#141414] px-4 py-2.5 text-sm font-black text-white">Print / Save PDF</button><a href={`/jobs/${reference}?tab=invoice`} className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-black">Back to job</a></div>
  <article className="mx-auto min-h-[1120px] max-w-[900px] bg-white px-10 py-9 shadow-xl sm:px-14">
   <header className="flex items-start justify-between gap-8 border-b-4 border-[var(--brand)] pb-5"><div>{logo&&<img src={logo} alt={crmConfig.businessName} className="h-20 max-w-[280px] object-contain"/>}</div><div className="text-right"><h1 className="text-2xl font-black uppercase">Invoice</h1><p className="mt-1 text-lg font-black text-[var(--brand)]">{invoice.invoice_number||reference}</p><p className="mt-1 text-xs text-black/55">Issued {new Date(invoice.invoice_date||invoice.created_at).toLocaleDateString("en-GB")}</p></div></header>
   <section className="mt-6 grid gap-6 sm:grid-cols-2"><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[var(--brand)]">Client</p><p className="mt-1 font-black">{name}</p>{site&&<p className="mt-1 text-sm text-black/65">{site}</p>}</div><div className="sm:text-right"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[var(--brand)]">Job reference</p><p className="mt-1 font-black">{reference}</p></div></section>
   <section className="mt-8 rounded-xl bg-[#f5f5f2] p-5"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[var(--brand)]">Works</p><p className="mt-2 whitespace-pre-line text-sm leading-6">{j.customer_requirements||([...(j.job_types||[]),j.job_type].filter(Boolean).join(" / "))||"Works as agreed"}</p></section>
   <section className="mt-8 flex justify-end"><div className="w-full max-w-sm border-t-2 border-black pt-4"><div className="flex justify-between text-xl font-black"><span>Total</span><span>{money(amount)}</span></div>{Number(invoice.amount_due??amount)!==Number(amount)&&<div className="mt-2 flex justify-between text-sm"><span>Amount due</span><b>{money(invoice.amount_due)}</b></div>}</div></section>
   <footer className="mt-12 border-t border-black/10 pt-5 text-xs text-black/50">{crmConfig.businessName}</footer>
  </article>
 </main>;
}