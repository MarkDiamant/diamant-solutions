"use client";
import { friendlyError } from "../../lib/friendly-error";


import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_CRM_CONFIG } from "@/lib/crm/config";

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value || 0));
}

export default function XeroInvoicePage({ reference }: { reference: string }) {
  const [jobData, setJobData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sharing,setSharing]=useState("");
  const [pdfDownloading,setPdfDownloading]=useState(false);
  const [pdfPreviewLoading,setPdfPreviewLoading]=useState(false);
  const [pdfPreview,setPdfPreview]=useState("");
  const [xeroConnected,setXeroConnected]=useState<boolean|null>(null);
  const [confirmAction,setConfirmAction]=useState<"approve"|"approve_send"|"approve_bms"|null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [crmConfig,setCrmConfig]=useState(DEFAULT_CRM_CONFIG);
  const autoSyncBusy=useRef(false);
  const [sharePrompt,setSharePrompt]=useState<{file:File;text:string;number:string;invoiceNumber:string}|null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [jobRes, xeroRes] = await Promise.all([
      fetch(`/api/admin/jobs/${encodeURIComponent(reference)}`, { cache: "no-store" }),
      fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/xero`, { cache: "no-store" }),
    ]);
    if (jobRes.status === 401 || xeroRes.status === 401) { window.location.href = "/admin/login"; return; }
    const jobBody = await jobRes.json().catch(() => ({}));
    const xeroBody = await xeroRes.json().catch(() => ({}));
    if (!jobRes.ok) setError(jobBody.error || "Could not load job");
    else if (!xeroRes.ok) setError(xeroBody.error || "Could not load Xero invoices");
    else { setJobData(jobBody); setInvoices(xeroBody.invoices || []); }
    setLoading(false);
  }, [reference]);

  useEffect(() => { void load(); fetch("/api/admin/integrations/xero/status",{cache:"no-store"}).then(async r=>{if(r.ok){const b=await r.json();setXeroConnected(!!b.connected);}else setXeroConnected(null);}).catch(()=>setXeroConnected(null)); fetch("/api/admin/settings",{cache:"no-store"}).then(async r=>{if(r.ok){const b=await r.json();if(b.settings)setCrmConfig(b.settings);}}).catch(()=>{}); }, [load]);

  useEffect(()=>{if(xeroConnected!==true)return;let cancelled=false;async function reconcile(){if(autoSyncBusy.current||document.visibilityState==="hidden")return;autoSyncBusy.current=true;try{const res=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/xero`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"sync"}),cache:"no-store"});if(res.ok&&!cancelled){const fresh=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/xero`,{cache:"no-store"});if(fresh.ok&&!cancelled){const body=await fresh.json();if(Array.isArray(body.invoices))setInvoices(body.invoices);}}}catch{}finally{autoSyncBusy.current=false;}}void reconcile();const interval=window.setInterval(()=>void reconcile(),60000);const visible=()=>{if(document.visibilityState==="visible")void reconcile();};document.addEventListener("visibilitychange",visible);return()=>{cancelled=true;window.clearInterval(interval);document.removeEventListener("visibilitychange",visible);};},[reference,xeroConnected]);

  async function action(actionName: "create" | "create_bms" | "sync") {
    setBusy(true); setError(""); setMessage(actionName === "create_bms" ? "Creating BMS invoice..." : actionName === "create" ? "Creating Xero draft..." : "Syncing from Xero...");
    const res = await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/xero`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(friendlyError(body.error) || "Xero action failed"); setMessage(""); setBusy(false); return; }
    setMessage(actionName === "create_bms" ? "Standalone BMS invoice created. Open the invoice to print or save as PDF." : actionName === "create" ? "Draft invoice created in Xero" : "Xero status updated");
    
    await load(); setBusy(false);
  }

  async function approveOnly(){
    const invoice=invoices[0];if(!invoice||busy||invoice.provider==="bms")return;
    
    setBusy(true);setError("");setMessage("");
    try{
      const response=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/xero`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"approve",invoiceId:invoice.id,confirm:true})});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(friendlyError(data.error)||"Xero approval failed");
      await load();setMessage("Invoice approved in Xero. No email has been sent. Choose your preferred sharing method.");
    }catch(e){setError(friendlyError(e)||"Approval failed");}finally{setBusy(false);}
  }

  async function approveAndSend(){
    const invoice=invoices[0];if(!invoice||busy)return;
    const recipient=String(jobData?.customer?.email||"").trim();
    if(!recipient){setError("Customer email is missing. Add it before sending.");return;}
    
    setBusy(true);setError("");setMessage("Approving and sending through Xero...");
    try{
      const response=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/xero`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"approve_send",invoiceId:invoice.id,confirmedEmail:recipient,confirm:true})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(friendlyError(data.error)||"Xero could not send the invoice");
      setMessage("Invoice sent through Xero to "+recipient);await load();
    }catch(e){setError(friendlyError(e)||"Unable to send invoice");setMessage("");}
    finally{setBusy(false);}
  }

  async function approveBms(){
    const invoice=invoices[0];if(!invoice||busy||invoice.provider!=="bms")return;
    setBusy(true);setError("");setMessage("");
    try{
      const response=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/xero`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"approve_bms",invoiceId:invoice.id,confirm:true})});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(friendlyError(data.error)||"Could not approve invoice");
      await load();setMessage("BMS invoice approved. No email has been sent.");
    }catch(e){setError(friendlyError(e)||"Could not approve invoice");}finally{setBusy(false);}
  }

  async function viewXeroPdf(){
    const invoice=invoices[0];if(!invoice||pdfPreviewLoading)return;
    setPdfPreviewLoading(true);setError("");setMessage("Loading invoice preview...");
    try{
      const response=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/invoice-share?invoiceId=${encodeURIComponent(invoice.id)}`,{cache:"no-store"});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(friendlyError(body.error)||"Unable to view invoice");}
      const blob=await response.blob();if(!blob.type.includes("pdf"))throw new Error("Xero did not return a PDF");
      const url=URL.createObjectURL(blob);setPdfPreview(old=>{if(old)URL.revokeObjectURL(old);return url;});setMessage("");
    }catch(e){setError(friendlyError(e)||"Could not view invoice");setMessage("");}finally{setPdfPreviewLoading(false);}
  }

  async function openXeroPdf(){
    const invoice=invoices[0];if(!invoice||pdfDownloading)return;
    setPdfDownloading(true);setError("");setMessage("Downloading Xero invoice PDF...");
    try{
      const response=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/invoice-share?invoiceId=${encodeURIComponent(invoice.id)}`,{cache:"no-store"});
      if(!response.ok){const b=await response.json().catch(()=>({}));throw new Error(friendlyError(b.error)||"Unable to load Xero invoice PDF");}
      const blob=await response.blob(),url=URL.createObjectURL(blob);
      const link=document.createElement("a");link.href=url;link.download=`${invoice.invoice_number||reference}-Xero-Invoice.pdf`;document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      setMessage("Xero's original invoice PDF downloaded.");
    }catch(e){setError(friendlyError(e)||"Unable to download invoice");setMessage("");}finally{setPdfDownloading(false);}
  }

  async function shareInvoice(invoice:any,action:"draft"|"send"|"whatsapp"){
    if(sharing)return;
    if(String(invoice.status).toUpperCase()==="DRAFT"){setError("Approve the invoice first. Draft invoices cannot be shared or emailed.");return;}
    setSharing(action);setError("");setMessage("");
    try{
      const base=`/api/admin/jobs/${encodeURIComponent(reference)}/invoice-share`;
      if(action==="whatsapp"){
        const response=await fetch(`${base}?invoiceId=${encodeURIComponent(invoice.id)}`,{cache:"no-store"});
        if(!response.ok){const b=await response.json().catch(()=>({}));throw new Error(friendlyError(b.error)||"Could not retrieve invoice PDF");}
        const blob=await response.blob(),file=new File([blob],`${invoice.invoice_number||reference}-Invoice.pdf`,{type:"application/pdf"});
        const raw=String(jobData?.customer?.mobile||jobData?.customer?.phone||"").trim();const digits=raw.replace(/[^\\d+]/g,"");
        let number=digits.startsWith("+")?digits.slice(1):digits.startsWith("00")?digits.slice(2):digits.startsWith("0")?"44"+digits.slice(1):digits;
        if(!/^\\d{8,15}$/.test(number))number="";
        const firstName=String(jobData?.customer?.first_name||"").trim().split(/\s+/)[0]||"there";
        const text=`Hi ${firstName},\n\nPlease find attached invoice ${invoice.invoice_number||reference} for ${String(jobData?.job?.job_type||"the work carried out").toLowerCase()}.\n\nThank you for your business, we really appreciate it. If you have any questions, please get in touch.\n\nKind regards,\n${crmConfig.businessName}`;
        setSharePrompt({file,text,number,invoiceNumber:String(invoice.invoice_number||reference)});
        setMessage("Review the invoice sharing details below before proceeding.");
      }else{
        const response=await fetch(base,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({invoiceId:invoice.id,action})});
        const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(friendlyError(result.error)||"Invoice email failed");
        setMessage(action==="draft"?"Invoice email draft created in connected Gmail with PDF attached. Open Gmail to review it.":`Invoice emailed with PDF to ${result.to}.`);
      }
    }catch(e){setError(friendlyError(e)||"Could not share invoice");}
    finally{setSharing("");}
  }

  async function finishWhatsAppShare(nativeShare:boolean){
    const prompt=sharePrompt;if(!prompt)return;setSharePrompt(null);
    if(nativeShare&&navigator.share&&navigator.canShare?.({files:[prompt.file]})){
      try{await navigator.share({files:[prompt.file],text:prompt.text,title:"Invoice "+prompt.invoiceNumber});setMessage("Sharing opened. Confirm the recipient in WhatsApp.");return;}catch(e){if((e as DOMException)?.name==="AbortError")return;}
    }
    const url=URL.createObjectURL(prompt.file),a=document.createElement("a");a.href=url;a.download=prompt.file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    let copied=false;try{await navigator.clipboard.writeText(prompt.text);copied=true;}catch{}
    const target="https://wa.me/"+prompt.number+"?text="+encodeURIComponent(prompt.text);
    const opened=window.open(target,"_blank","noopener,noreferrer");if(!opened)window.location.assign(target);
    setMessage(copied?"Message copied. Attach the downloaded invoice PDF in WhatsApp before sending.":"Invoice PDF downloaded. Attach it in WhatsApp before sending.");
  }

  if (loading && !jobData) return <main className="min-h-screen bg-[#f5f5f2] p-10 text-center">Loading Xero...</main>;
  const job = jobData?.job || {};
  const customer = jobData?.customer || {};
  const latestQuote=[...(jobData?.quotes||[])].sort((a:any,b:any)=>Number(b.version||0)-Number(a.version||0))[0];
  const amount = Number(job.agreed_amount || latestQuote?.amount || job.quoted_amount || 0);
  const invoiceDescription=job.job_type||"Metalwork services";
  const name = String(customer.last_name||customer.first_name||"Customer").trim();
  const invoiceTemplate=crmConfig.invoiceTemplate;
  const invoiceClass=invoiceTemplate==="classic"?"font-serif":"";
  const invoiceAccent=invoiceTemplate==="classic"?"#141414":invoiceTemplate==="mj-signature"?crmConfig.accentColour:"#141414";

  return <main className={`min-h-screen bg-[#f5f5f2] px-5 py-8 text-[#141414] ${invoiceClass}`} style={{"--invoice-accent":invoiceAccent} as React.CSSProperties}>
    <style>{`@media print{@page{size:A4;margin:0}body{background:white}.invoice-controls{display:none!important}.invoice-sheet{display:flex!important;width:210mm;min-height:297mm;margin:0!important;box-shadow:none!important;border:0!important}}`}</style><div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="mb-3 flex items-center gap-4"><img src={crmConfig.logoUrl} alt={crmConfig.businessName} className="h-10 max-w-32 object-contain"/><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--invoice-accent)]">{invoiceTemplate==="mj-signature"?"Invoice":"Xero invoice"}</p></div><h1 className="mt-1 text-3xl font-black">{reference} invoice</h1><p className="mt-2 text-sm text-black/55">{name} · {job.job_type || "Job"}</p></div>
        <div className="invoice-controls flex gap-2">{invoices.length>0&&invoices[0].provider!=="bms"&&<button type="button" disabled={pdfPreviewLoading||pdfDownloading} onClick={()=>void viewXeroPdf()} className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-black">{pdfPreviewLoading?"Loading preview...":"View invoice PDF"}</button>}{invoices.length>0&&invoices[0].provider!=="bms"&&<button type="button" disabled={pdfDownloading} onClick={()=>void openXeroPdf()} className="rounded-xl bg-[var(--invoice-accent)] px-4 py-2.5 text-sm font-black text-white">{pdfDownloading?"Downloading PDF...":"Download Xero invoice PDF"}</button>}<Link href={`/admin/jobs/${reference}`} className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold">Back to job</Link></div>
      </div>

      {confirmAction&&invoices[0]&&<section role="dialog" aria-modal="true" aria-label="Confirm invoice approval" className="invoice-controls mt-5 rounded-2xl border-2 border-[var(--invoice-accent)] bg-white p-5 shadow-lg"><div className="flex items-center gap-3">{crmConfig.logoUrl&&<img src={crmConfig.logoUrl} alt={crmConfig.businessName} className="h-10 max-w-28 object-contain"/>}<div><p className="font-black text-[var(--invoice-accent)]">{crmConfig.businessName}</p><h2 className="text-lg font-black">Confirm invoice approval</h2></div></div><p className="mt-3 text-sm">Invoice <strong>{invoices[0].invoice_number||reference}</strong> for <strong>{name}</strong>, amount <strong>{money(invoices[0].total)}</strong>.</p><p className="mt-2 text-sm">{confirmAction==="approve_send"?"This will approve the invoice in Xero and email it immediately to "+String(customer.email||"the customer")+".":confirmAction==="approve"?"This will approve the invoice in Xero without sending an email. You can then choose Gmail or WhatsApp.":"This will approve the BMS invoice without sending an email."}</p><div className="mt-4 flex gap-2"><button disabled={busy} className="rounded-xl bg-[var(--invoice-accent)] px-4 py-2.5 font-bold text-white" onClick={()=>{const choice=confirmAction;setConfirmAction(null);if(choice==="approve_send")void approveAndSend();else if(choice==="approve_bms")void approveBms();else void approveOnly();}}>Confirm</button><button className="rounded-xl border border-black/15 px-4 py-2.5 font-bold" onClick={()=>setConfirmAction(null)}>Cancel</button></div></section>}
      {pdfPreview&&<section role="dialog" aria-modal="true" aria-label="Invoice PDF preview" className="invoice-controls mt-5 rounded-2xl border border-[var(--invoice-accent)] bg-white p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-black">Invoice PDF preview</h2><button className="rounded-xl bg-[var(--invoice-accent)] px-4 py-2 text-sm font-bold text-white" onClick={()=>{URL.revokeObjectURL(pdfPreview);setPdfPreview("");}}>Close preview</button></div><iframe title="Invoice PDF preview" src={pdfPreview} className="h-[75vh] w-full rounded-xl border border-black/10"/></section>}
      {sharePrompt&&<section role="dialog" aria-modal="true" aria-label="Share invoice via WhatsApp" className="invoice-controls mt-5 rounded-2xl border-2 border-[var(--invoice-accent)] bg-white p-5 shadow-lg"><div className="flex items-center gap-3">{crmConfig.logoUrl&&<img src={crmConfig.logoUrl} alt={crmConfig.businessName} className="h-10 max-w-28 object-contain"/>}<div><p className="font-black text-[var(--invoice-accent)]">{crmConfig.businessName}</p><h2 className="text-lg font-black">Share invoice via WhatsApp</h2></div></div><p className="mt-3 text-sm">Review the message before sharing. This does not mark the invoice as sent in Xero.</p><pre className="mt-3 whitespace-pre-wrap rounded-xl bg-[#f7f7f4] p-4 text-sm">{sharePrompt.text}</pre><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-xl bg-[var(--invoice-accent)] px-4 py-2.5 font-bold text-white" onClick={()=>void finishWhatsAppShare(true)}>Share PDF and message</button><button className="rounded-xl border border-black/15 px-4 py-2.5 font-bold" onClick={()=>void finishWhatsAppShare(false)}>Download PDF and open WhatsApp</button><button className="rounded-xl border border-black/15 px-4 py-2.5" onClick={()=>setSharePrompt(null)}>Cancel</button></div></section>}
      {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {message && <p className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{message}</p>}

      <section className="invoice-controls mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs font-bold uppercase text-black/45">Customer</p><p className="mt-1 font-black">{name}</p></div><div><p className="text-xs font-bold uppercase text-black/45">Invoice amount</p><p className="mt-1 text-xl font-black">{money(amount)}</p><p className="mt-1 text-xs text-black/45">{crmConfig.businessDetails.vatRegistered?"VAT charged according to business settings":"VAT not charged"}</p></div><div><p className="text-xs font-bold uppercase text-black/45">BMS reference</p><p className="mt-1 font-black text-[var(--invoice-accent)]">{reference}</p></div></div>
        {invoices.length>0&&invoices[0].provider!=="bms"&&<div className="mt-5"><button type="button" disabled={busy||String(invoices[0].status).toUpperCase()!=="DRAFT"} onClick={()=>setConfirmAction("approve")} className="mr-2 rounded-xl bg-[var(--invoice-accent)] px-5 py-3 text-sm font-black text-white disabled:opacity-40">Approve in Xero but don’t send</button><button disabled={busy||!!sharing||String(invoices[0].status).toUpperCase()==="PAID"} onClick={()=>setConfirmAction("approve_send")} className="rounded-xl bg-[var(--invoice-accent)] px-5 py-3 text-sm font-black text-white disabled:opacity-50">Approve and send via Xero</button><p className="mt-2 text-xs text-black/55">Choose whether to approve without emailing, or approve and send through Xero. You will review your choice before anything changes.</p></div>}{invoices.length>0&&invoices[0].provider!=="bms"&&<div className="mt-6 rounded-xl border border-black/10 bg-[#f7f7f4] p-4"><p className="mb-3 text-sm font-black">Email or WhatsApp your invoice</p><p className="mb-3 text-xs text-black/60">Available once the invoice is approved in Xero. Choose Gmail or WhatsApp if you do not want Xero to email it.</p><div className="flex flex-wrap gap-2"><button disabled={!!sharing||String(invoices[0].status).toUpperCase()==="DRAFT"} onClick={()=>void shareInvoice(invoices[0],"draft")} className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50">Create Gmail draft</button><button disabled={!!sharing||String(invoices[0].status).toUpperCase()==="DRAFT"} onClick={()=>void shareInvoice(invoices[0],"send")} className="rounded-xl bg-[var(--invoice-accent)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">Send via Gmail</button><button disabled={!!sharing||String(invoices[0].status).toUpperCase()==="DRAFT"} onClick={()=>void shareInvoice(invoices[0],"whatsapp")} className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50">Share via WhatsApp</button></div><p className="mt-2 text-xs text-black/55">We attach the official Xero PDF. Gmail drafts are not sent automatically. WhatsApp lets you review the message and attach the PDF yourself.</p></div>}
        <div className="mt-6 flex flex-wrap gap-3">
          {invoices.length === 0 ? <><button disabled={busy || amount <= 0 || xeroConnected===null} onClick={() => void action(xeroConnected===false?"create_bms":"create")} className="rounded-xl bg-[var(--invoice-accent)] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{xeroConnected===false?"Convert to BMS invoice":xeroConnected===true?"Convert to Xero invoice":"Checking Xero connection..."}</button></> : invoices[0].provider==="bms" ? <><button disabled={busy||invoices[0].status!=="DRAFT"} onClick={()=>setConfirmAction("approve_bms")} className="rounded-xl bg-[var(--invoice-accent)] px-5 py-3 text-sm font-black text-white disabled:opacity-40">Approve BMS invoice</button><a href={`/bms-runtime/jobs/${encodeURIComponent(reference)}/invoice/${encodeURIComponent(invoices[0].id)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[var(--invoice-accent)] px-5 py-3 text-sm font-black text-white">Open / send invoice</a></> : <button disabled={busy} onClick={() => void action("sync")} className="rounded-xl bg-[var(--invoice-accent)] px-5 py-3 text-sm font-black text-white disabled:opacity-50">Refresh invoice status</button>}
        </div>
        {invoices.length === 0 && <p className="mt-4 text-sm leading-6 text-black/55">{amount<=0?"Add an agreed or quoted amount before creating the invoice.":"The BMS will create a draft invoice using your tenant branding and quote amount. If Xero is connected, the invoice is created in Xero; otherwise it is created directly in BMS. Approve it before sending."}</p>}
      </section>


      {invoices[0]&&<article className="invoice-sheet mt-5 hidden min-h-[1120px] flex-col bg-white p-14 text-[#171717] shadow-xl print:flex"><header className="flex items-start justify-between border-b-4 border-[var(--invoice-accent)] pb-6"><img src={crmConfig.logoUrl} alt={crmConfig.businessName} className="h-20 max-w-56 object-contain"/><div className="text-right"><h2 className="text-3xl font-black uppercase">Invoice</h2><p className="mt-1 font-black text-[var(--invoice-accent)]">{invoices[0].invoice_number||reference}</p><p className="mt-1 text-xs text-black/50">BMS reference {reference}</p>{invoices[0].invoice_date&&<p className="mt-1 text-xs text-black/50">Invoice date {new Date(`${invoices[0].invoice_date}T12:00:00`).toLocaleDateString("en-GB")}</p>}{invoices[0].due_date&&<p className="text-xs text-black/50">Due {new Date(`${invoices[0].due_date}T12:00:00`).toLocaleDateString("en-GB")}</p>}</div></header><section className="mt-8 grid grid-cols-2 gap-10"><div><p className="text-[10px] font-black uppercase tracking-wider text-[var(--invoice-accent)]">Bill to</p><p className="mt-2 text-lg font-black">{name}</p>{customer.email&&<p className="mt-1 text-sm text-black/60">{customer.email}</p>}{customer.phone&&<p className="text-sm text-black/60">{customer.phone}</p>}</div><div className="text-right"><p className="text-[10px] font-black uppercase tracking-wider text-black/40">Invoice total</p><p className="mt-2 text-3xl font-black">{money(invoices[0].total??amount)}</p><p className="mt-1 text-xs text-black/50">{crmConfig.businessDetails.vatRegistered?"VAT included where applicable":"VAT not charged"}</p></div></section><section className="mt-10 border-y border-black/10 py-6"><p className="text-xs font-black uppercase tracking-wider text-black/40">Description</p><p className="mt-2 text-sm leading-6">{invoiceDescription}</p></section><section className="mt-8 grid grid-cols-2 gap-8 text-sm"><div><p className="font-black">Payment details</p>{crmConfig.businessDetails.bankName&&<p className="mt-2">{crmConfig.businessDetails.bankName}</p>}{crmConfig.businessDetails.sortCode&&<p>Sort code: {crmConfig.businessDetails.sortCode}</p>}{crmConfig.businessDetails.accountNumber&&<p>Account: {crmConfig.businessDetails.accountNumber}</p>}</div><div className="text-right"><p><b>Paid:</b> {money(invoices[0].amount_paid)}</p><p><b>Amount due:</b> {money(invoices[0].amount_due)}</p></div></section><footer className="mt-auto border-t border-black/10 pt-5 text-[10px] leading-5 text-black/50"><p className="font-black text-black/70">{crmConfig.businessName}</p><p>{crmConfig.businessDetails.officeAddress}</p><p>{[crmConfig.businessDetails.phone,crmConfig.businessDetails.email,crmConfig.businessDetails.website,crmConfig.businessDetails.companyNumber?`Company No. ${crmConfig.businessDetails.companyNumber}`:"",crmConfig.businessDetails.vatRegistered&&crmConfig.businessDetails.vatNumber?`VAT ${crmConfig.businessDetails.vatNumber}`:""].filter(Boolean).join(" · ")}</p></footer></article>}
      <section className="invoice-controls mt-5 rounded-2xl border border-black/10 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-black">Xero invoice status</h2>
        {invoices.length === 0 ? <p className="mt-4 text-sm text-black/50">No Xero invoice has been created for this job yet.</p> : <div className="mt-4 space-y-3">{invoices.map((invoice) => <div key={invoice.id} className="rounded-xl border border-black/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">{invoice.invoice_number || "Xero draft"}</p><p className="mt-1 text-xs text-black/45">Status: {invoice.status} · Last synced {new Date(invoice.synced_at).toLocaleString("en-GB")}</p>{invoice.external_invoice_id&&<a href={`https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${encodeURIComponent(invoice.external_invoice_id)}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-bold underline text-[var(--invoice-accent)]">Open invoice in Xero</a>}</div><div className="text-right"><p className="font-black">{money(invoice.total)}</p><p className="text-xs text-black/45">Paid {money(invoice.amount_paid)} · Due {money(invoice.amount_due)}</p></div></div></div>)}</div>}
      </section>
    </div>
  </main>;
}
