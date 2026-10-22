"use client";
import { friendlyError } from "../../lib/friendly-error";


import Link from "next/link";
import { createPortal } from "react-dom";
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
  const [pdfPreviewFile,setPdfPreviewFile]=useState<Blob|null>(null);
  const [pdfPages,setPdfPages]=useState<string[]>([]);
  const [pdfRenderError,setPdfRenderError]=useState("");
  const [pdfRendering,setPdfRendering]=useState(false);
  const [xeroConnected,setXeroConnected]=useState<boolean|null>(null);
  const [confirmAction,setConfirmAction]=useState<"approve"|"approve_send"|"approve_bms"|null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [crmConfig,setCrmConfig]=useState(DEFAULT_CRM_CONFIG);
  const [senderName,setSenderName]=useState("");
  const autoSyncBusy=useRef(false); const previewLoaded=useRef("");
  const [sharePrompt,setSharePrompt]=useState<{file:File;text:string;number:string;invoiceNumber:string}|null>(null);
  const [emailPrompt,setEmailPrompt]=useState<{action:"draft"|"send";to:string;subject:string;body:string}|null>(null);

  useEffect(()=>{if(!sharePrompt&&!emailPrompt)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=previous;};},[sharePrompt,emailPrompt]);

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

  useEffect(() => { void load(); fetch("/api/admin/session",{cache:"no-store"}).then(async r=>{if(r.ok){const v=await r.json();setSenderName(String(v.admin?.name||v.user?.display_name||v.user?.name||v.name||"").trim().split(/\\s+/)[0]);}}).catch(()=>{}); fetch("/api/admin/integrations/xero/status",{cache:"no-store"}).then(async r=>{if(r.ok){const b=await r.json();setXeroConnected(!!b.connected);}else setXeroConnected(null);}).catch(()=>setXeroConnected(null)); fetch("/api/admin/settings",{cache:"no-store"}).then(async r=>{if(r.ok){const b=await r.json();if(b.settings)setCrmConfig(b.settings);}}).catch(()=>{}); }, [load]);

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
      await load();setMessage("Invoice approved in Xero. Nothing has been sent to the customer. You can now share it using your preferred method.");
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

  useEffect(()=>{
    if(!pdfPreviewFile){setPdfPages([]);return;}
    let cancelled=false;
    async function render(){
      setPdfRendering(true);setPdfRenderError("");
      try{
        const lib=await new Promise<any>((resolve,reject)=>{
          const existing=(window as any).pdfjsLib;
          if(existing){resolve(existing);return;}
          const script=document.createElement("script");
          script.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload=()=>resolve((window as any).pdfjsLib);
          script.onerror=()=>reject(new Error("PDF renderer could not load"));
          document.head.appendChild(script);
        });
        lib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        const pdf=await lib.getDocument({data:new Uint8Array(await pdfPreviewFile.arrayBuffer())}).promise;
        const images:string[]=[];
        for(let n=1;n<=Math.min(pdf.numPages,12);n++){
          if(cancelled)return;
          const page=await pdf.getPage(n);
          const viewport=page.getViewport({scale:1.5});
          const canvas=document.createElement("canvas");
          canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas unavailable");
          await page.render({canvasContext:ctx,viewport}).promise;
          images.push(canvas.toDataURL("image/png"));
        }
        if(!cancelled)setPdfPages(images);
      }catch(e){if(!cancelled)setPdfRenderError(e instanceof Error?e.message:"Preview unavailable");}
      finally{if(!cancelled)setPdfRendering(false);}
    }
    void render();
    return()=>{cancelled=true;};
  },[pdfPreviewFile]);

  async function viewXeroPdf(){
    const invoice=invoices[0];if(!invoice||pdfPreviewLoading)return;
    setPdfPreviewLoading(true);setError("");setMessage("Loading invoice preview...");
    try{
      const response=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/invoice-share?invoiceId=${encodeURIComponent(invoice.id)}`,{cache:"no-store"});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(friendlyError(body.error)||"Unable to view invoice");}
      const blob=await response.blob();if(!blob.type.includes("pdf"))throw new Error("Xero did not return a PDF");
      const url=URL.createObjectURL(blob);setPdfPreview(old=>{if(old)URL.revokeObjectURL(old);return url;});setPdfPreviewFile(blob);setMessage("");
    }catch(e){setError(friendlyError(e)||"Could not view invoice");setMessage("");}finally{setPdfPreviewLoading(false);}
  }

  useEffect(()=>{const inv=invoices[0];if(!inv||inv.provider==="bms"||previewLoaded.current===String(inv.id))return;previewLoaded.current=String(inv.id);void viewXeroPdf();},[invoices]);
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
        const text=`Hi ${firstName},\n\nPlease find attached invoice ${invoice.invoice_number||reference} for ${String(jobData?.job?.job_title||jobData?.job?.job_type||"the agreed work").toLowerCase()}.\n\nTo get started on your project, we kindly ask for a 50% deposit. Once received, we can begin work, with the remaining 50% payable on completion.\n\nThank you for your business, we really appreciate it. If you have any questions, please get in touch.\n\nKind regards,\n${senderName?senderName+"\n":""}${crmConfig.businessName}`;
        setSharePrompt({file,text,number,invoiceNumber:String(invoice.invoice_number||reference)});
        setMessage("");
      }else{
        setEmailPrompt({action,to:String(jobData?.customer?.email||""),subject:`${crmConfig.businessName} invoice ${invoice.invoice_number||reference}`,body:`Hi ${String(jobData?.customer?.first_name||"").trim().split(/\s+/)[0]||"there"},\n\nPlease find attached your invoice ${invoice.invoice_number||reference}.\n\nTo get started on your project, we kindly ask for a 50% deposit. Once received, we can begin work, with the remaining 50% payable on completion.\n\nThank you very much for your business, we really appreciate it. If you have any questions at all, please feel free to get in touch.\n\nKind regards,\n${senderName?senderName+"\n":""}${crmConfig.businessName}`});return;
      }
    }catch(e){setError(friendlyError(e)||"Could not share invoice");}
    finally{setSharing("");}
  }

  async function confirmEmailShare(){
    const prompt=emailPrompt;if(!prompt)return;setSharing(prompt.action);setError("");setEmailPrompt(null);
    try{
      const base=`/api/admin/jobs/${encodeURIComponent(reference)}/invoice-share`;
        const response=await fetch(base,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({invoiceId:invoices[0]?.id,action:prompt.action,subject:prompt.subject,body:prompt.body,to:prompt.to})});
        const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(friendlyError(result.error)||"Invoice email failed");
        setMessage(prompt.action==="draft"?"Email draft created with the invoice PDF attached. Review it in your connected email account.":`Invoice emailed with PDF attached to ${result.to}.`);
    }catch(e){setError(friendlyError(e)||"Could not share invoice");}
    finally{setSharing("");}
  }

  async function finishWhatsAppShare(){
    const prompt=sharePrompt;if(!prompt)return;
    setError("");
    if(navigator.share&&navigator.canShare?.({files:[prompt.file]})){
      // Preserve the user gesture for Android's native file-share chooser.
      // WhatsApp must be selected there; browsers cannot silently choose a specific app.
      try{void navigator.clipboard?.writeText(prompt.text).catch(()=>{});}catch{}
      try{
        await navigator.share({files:[prompt.file],title:"Invoice "+prompt.invoiceNumber});
        setSharePrompt(null);
        setMessage("Invoice PDF handed to your chosen app. Paste the message into WhatsApp before sending.");
        return;
      }catch(e){
        if((e as DOMException)?.name==="AbortError")return;
      }
    }
    // On browsers without file-sharing support, avoid falsely claiming WhatsApp has an attachment.
    const url=URL.createObjectURL(prompt.file),link=document.createElement("a");
    link.href=url;link.download=prompt.file.name;document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    try{await navigator.clipboard.writeText(prompt.text);}catch{}
    setSharePrompt(null);
    setMessage("This browser cannot attach a PDF directly to WhatsApp. The PDF has been saved and the message copied. Attach the saved PDF in WhatsApp and paste the message.");
  }

  if (loading && !jobData) return <main className="min-h-screen bg-[#f5f5f2] p-10 text-center">Loading Xero...</main>;
  const job = jobData?.job || {};
  const customer = jobData?.customer || {};
  const latestQuote=[...(jobData?.quotes||[])].sort((a:any,b:any)=>Number(b.version||0)-Number(a.version||0))[0];
  const amount = Number(job.agreed_amount || latestQuote?.amount || job.quoted_amount || 0);
  const invoiceDescription=job.job_title||job.job_type||"Services";
  const name = String(customer.last_name||customer.first_name||"Customer").trim();
  const invoiceTemplate=crmConfig.invoiceTemplate;
  const invoiceClass=invoiceTemplate==="classic"?"font-serif":"";
  const invoiceAccent=crmConfig.accentColour||"#e66a24";

  return <main className={`min-h-screen bg-[#f5f5f2] px-4 py-7 sm:px-6 sm:py-10 text-[#141414] ${invoiceClass}`} style={{"--invoice-accent":invoiceAccent} as React.CSSProperties}>
    <style>{`@media print{@page{size:A4;margin:0}body{background:white}.invoice-controls{display:none!important}.invoice-sheet{display:flex!important;width:210mm;min-height:297mm;margin:0!important;box-shadow:none!important;border:0!important}}`}</style><div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="mb-3 flex items-center gap-4"><img src={crmConfig.logoUrl} alt={crmConfig.businessName} className="h-10 max-w-32 object-contain"/><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--invoice-accent)]">{invoiceTemplate==="mj-signature"?"Invoice":"Xero invoice"}</p></div><h1 className="mt-1 text-3xl font-black">{reference} invoice</h1><p className="mt-2 text-sm text-black/55">{name} · {job.job_title || job.job_type || "Job"}</p></div>
        <div className="invoice-controls grid w-full grid-cols-3 gap-2.5 sm:w-auto sm:min-w-[380px]">{invoices.length>0&&invoices[0].provider!=="bms"&&<button type="button" disabled={pdfPreviewLoading||pdfDownloading} onClick={()=>void viewXeroPdf()} style={{backgroundColor:crmConfig.accentColour}} className="flex min-h-[68px] items-center justify-center rounded-xl px-2 py-2 text-center text-[11px] font-black leading-4 text-white disabled:opacity-50 sm:text-xs">{pdfPreviewLoading?"Loading...":<>View invoice<br/>PDF</>}</button>}{invoices.length>0&&invoices[0].provider!=="bms"&&<button type="button" disabled={pdfDownloading} onClick={()=>void openXeroPdf()} style={{backgroundColor:crmConfig.accentColour}} className="flex min-h-[68px] items-center justify-center rounded-xl px-2 py-2 text-center text-[11px] font-black leading-4 text-white disabled:opacity-50 sm:text-xs">{pdfDownloading?"Downloading...":<>Download Xero<br/>invoice PDF</>}</button>}<Link href={`/admin/jobs/${reference}`} style={{backgroundColor:crmConfig.accentColour}} className="flex min-h-[68px] items-center justify-center rounded-xl px-2 py-2 text-center text-[11px] font-black leading-4 text-white sm:text-xs">Back to<br/>job</Link></div>
      </div>

      {confirmAction&&invoices[0]&&createPortal(<section role="dialog" aria-modal="true" aria-label="Confirm invoice approval" className="fixed inset-0 z-[2147483647] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/55 px-4 py-5" onClick={()=>!busy&&setConfirmAction(null)}><div className="w-full max-w-md rounded-2xl border-2 border-[var(--invoice-accent)] bg-white p-5 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center gap-3">{crmConfig.logoUrl&&<img src={crmConfig.logoUrl} alt={crmConfig.businessName} className="h-10 max-w-28 object-contain"/>}<div><p className="font-black text-[var(--invoice-accent)]">{crmConfig.businessName}</p><h2 className="text-lg font-black">Confirm invoice approval</h2></div></div><p className="mt-3 text-sm">Invoice <strong>{invoices[0].invoice_number||reference}</strong> for <strong>{name}</strong>, amount <strong>{money(invoices[0].total)}</strong>.</p><p className="mt-2 text-sm">{confirmAction==="approve_send"?"This will approve the invoice in Xero and email it immediately to "+String(customer.email||"the customer")+".":confirmAction==="approve"?"This will approve the invoice in Xero without sending an email. You can share it with the customer using your preferred method.":"This will approve the BMS invoice without sending an email."}</p><div className="mt-4 flex gap-2"><button disabled={busy} className="rounded-xl bg-[var(--invoice-accent)] px-4 py-2.5 font-bold text-white" onClick={()=>{const choice=confirmAction;setConfirmAction(null);if(choice==="approve_send")void approveAndSend();else if(choice==="approve_bms")void approveBms();else void approveOnly();}}>Confirm</button><button className="rounded-xl border border-black/15 px-4 py-2.5 font-bold" onClick={()=>setConfirmAction(null)}>Cancel</button></div></div></section>,document.body)}
      {pdfPreview&&<section role="dialog" aria-modal="true" aria-label="Invoice PDF preview" className="invoice-controls mt-8 rounded-2xl border border-[var(--invoice-accent)] bg-white p-4 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-black">Invoice PDF preview</h2><button className="rounded-xl bg-[var(--invoice-accent)] px-4 py-2 text-sm font-bold text-white" onClick={()=>{URL.revokeObjectURL(pdfPreview);setPdfPreview("");}}>Close preview</button></div><div className="mb-5 flex flex-wrap gap-3"><a href={pdfPreview} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-black/15 px-4 py-2 text-sm font-bold">Open PDF in browser</a><button type="button" onClick={()=>{if(!pdfPreviewFile)return;const link=document.createElement("a");link.href=pdfPreview;link.download=`${invoices[0]?.invoice_number||reference}-Invoice.pdf`;document.body.appendChild(link);link.click();link.remove();}} className="rounded-xl bg-[var(--invoice-accent)] px-4 py-2 text-sm font-bold text-white">Download PDF</button></div><div className="rounded-xl border border-black/10 bg-white p-2">{pdfRendering&&<p className="py-12 text-center text-sm text-black/60">Rendering invoice pages...</p>}{pdfPages.length>0?<div className="space-y-4">{pdfPages.map((page,index)=><img key={index} src={page} alt={`Invoice PDF page ${index+1}`} className="mx-auto h-auto w-full max-w-[800px] rounded-md border border-black/10 shadow-sm"/>)}</div>:!pdfRendering&&<div className="py-10 text-center text-sm text-black/60">Preview unavailable on this device. Use Download PDF above.{pdfRenderError&&<p className="mt-2 text-xs">{pdfRenderError}</p>}</div>}</div></section>}
      {sharePrompt&&createPortal(<section role="dialog" aria-modal="true" aria-label="Share invoice via WhatsApp" className="fixed inset-0 z-[2147483647] flex items-center justify-center overflow-hidden bg-black/55 p-3 sm:p-4" onClick={()=>setSharePrompt(null)}><div style={{height:"min(740px, calc(100dvh - 24px))",maxHeight:"calc(100dvh - 24px)"}} className="flex w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e=>e.stopPropagation()}><div style={{overscrollBehavior:"contain",WebkitOverflowScrolling:"touch"}} className="min-h-0 flex-1 overflow-y-auto touch-pan-y p-5 sm:p-7"><div className="flex items-center gap-3">{crmConfig.logoUrl&&<img src={crmConfig.logoUrl} alt={crmConfig.businessName} className="h-10 max-w-28 object-contain"/>}<div><p className="text-sm font-bold text-[var(--invoice-accent)]">{crmConfig.businessName}</p><h2 className="text-lg font-black">Share invoice via WhatsApp</h2></div></div><p className="mt-4 text-sm leading-6 text-black/65">Your invoice PDF is ready to share. Review the friendly message below before proceeding. Sharing does not mark the invoice as sent in Xero.</p><div className="mt-4 whitespace-pre-wrap rounded-xl border border-black/10 bg-[#f8f8f6] p-4 font-sans text-sm leading-6 text-black/85">{sharePrompt.text}</div></div><div className="flex shrink-0 flex-col gap-2 border-t border-black/10 bg-white p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] sm:flex-row"><button type="button" style={{backgroundColor:crmConfig.accentColour||"#e66a24"}} className="min-h-12 w-full rounded-xl px-4 py-3 text-sm font-bold !text-white sm:flex-1" onClick={()=>void finishWhatsAppShare()}>Share via WhatsApp</button><button type="button" className="min-h-12 w-full rounded-xl border border-black/20 bg-white px-4 py-3 text-sm font-bold text-black sm:w-auto" onClick={()=>setSharePrompt(null)}>Cancel</button></div></div></section>,document.body)}
      {emailPrompt&&createPortal(<section role="dialog" aria-modal="true" aria-label="Review invoice email" className="fixed inset-0 z-[2147483647] flex items-center justify-center overflow-hidden bg-black/55 p-3 sm:p-4" onClick={()=>setEmailPrompt(null)}><div style={{maxHeight:"calc(100dvh - 24px)",overscrollBehavior:"contain",WebkitOverflowScrolling:"touch"}} className="w-full max-w-lg min-h-0 overflow-y-auto touch-pan-y rounded-2xl bg-white p-5 shadow-2xl sm:p-7" onClick={e=>e.stopPropagation()}><div className="flex items-center gap-3">{crmConfig.logoUrl&&<img src={crmConfig.logoUrl} alt={crmConfig.businessName} className="h-10 max-w-28 object-contain"/>}<div><p className="text-sm font-bold text-[var(--invoice-accent)]">{crmConfig.businessName}</p><h2 className="text-lg font-black">Review invoice email</h2></div></div><p className="mt-3 text-sm leading-6 text-black/65">The official Xero invoice PDF will be attached automatically. Review the message before {emailPrompt.action==="draft"?"creating a draft":"sending"}.</p><label className="mt-4 block text-xs font-bold uppercase text-black/55">To<input type="email" value={emailPrompt.to} onChange={e=>setEmailPrompt(old=>old?{...old,to:e.target.value}:old)} className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2 text-sm font-normal text-black"/></label><label className="mt-3 block text-xs font-bold uppercase text-black/55">Subject<input value={emailPrompt.subject} onChange={e=>setEmailPrompt(old=>old?{...old,subject:e.target.value}:old)} className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2 text-sm font-normal text-black"/></label><label className="mt-3 block text-xs font-bold uppercase text-black/55">Message<textarea rows={8} value={emailPrompt.body} onChange={e=>setEmailPrompt(old=>old?{...old,body:e.target.value}:old)} className="mt-1 w-full resize-y rounded-lg border border-black/20 bg-[#f8f8f6] p-3 font-sans text-sm font-normal leading-6 text-black"/></label><div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-5 flex flex-col gap-2 border-t border-black/10 bg-white px-5 py-4 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] sm:-mx-7 sm:-mb-7 sm:flex-row sm:px-7"><button disabled={!!sharing||!emailPrompt.to.trim()||!emailPrompt.subject.trim()} onClick={()=>void confirmEmailShare()} style={{backgroundColor:crmConfig.accentColour||"#e66a24"}} className="min-h-12 w-full rounded-xl px-4 py-3 text-center text-sm font-bold !text-white disabled:opacity-40 sm:w-auto sm:flex-1">{emailPrompt.action==="draft"?"Create email draft":"Send email with PDF"}</button><button onClick={()=>setEmailPrompt(null)} className="min-h-12 w-full rounded-xl border border-black/20 bg-white px-4 py-3 text-sm font-bold text-black sm:w-auto">Cancel</button></div></div></section>,document.body)}
      {(message||error)&&createPortal(<div role="status" aria-live="polite" className="fixed inset-x-3 bottom-4 z-[2147483646] mx-auto max-w-lg rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black shadow-2xl"><div className="flex items-start gap-3"><span className="flex-1">{error||message}</span><button type="button" className="rounded-lg px-2 py-1 text-sm font-bold" onClick={()=>{setMessage("");setError("");}}>Close</button></div></div>,document.body)}
      {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {message && <p className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{message}</p>}

      <section style={{marginTop:20}} className="invoice-controls rounded-2xl border border-black/10 bg-white p-5 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs font-bold uppercase text-black/45">Customer</p><p className="mt-1 font-black">{name}</p></div><div><p className="text-xs font-bold uppercase text-black/45">Invoice amount</p><p className="mt-1 text-xl font-black">{money(amount)}</p><p className="mt-1 text-xs text-black/45">{crmConfig.businessDetails.vatRegistered?"VAT charged according to business settings":"VAT not charged"}</p></div><div><p className="text-xs font-bold uppercase text-black/45">BMS reference</p><p className="mt-1 font-black text-[var(--invoice-accent)]">{reference}</p></div></div>
        {invoices.length>0&&invoices[0].provider!=="bms"&&<div className="mt-5"><button type="button" disabled={busy||String(invoices[0].status).toUpperCase()!=="DRAFT"} onClick={()=>setConfirmAction("approve")} className="mb-3 mr-2 min-h-12 rounded-xl bg-[var(--invoice-accent)] px-5 py-3 text-sm font-black text-white disabled:opacity-40">Approve in Xero but don’t send</button><button disabled={busy||!!sharing||String(invoices[0].status).toUpperCase()==="PAID"} onClick={()=>setConfirmAction("approve_send")} className="mb-3 min-h-12 rounded-xl bg-[var(--invoice-accent)] px-5 py-3 text-sm font-black text-white disabled:opacity-50">Approve and send via Xero</button><p className="mt-2 text-xs text-black/55">Choose whether to approve without emailing, or approve and send through Xero. You will review your choice before anything changes.</p></div>}{invoices.length>0&&invoices[0].provider!=="bms"&&<div className="mt-6 rounded-xl border border-black/10 bg-[#f7f7f4] p-4"><p className="mb-3 text-sm font-black">Email or WhatsApp your invoice</p><p className="mb-3 text-xs text-black/60">Available once the invoice is approved in Xero. Choose email or WhatsApp if you prefer to send it yourself.</p><div className="flex flex-wrap gap-2"><button disabled={!!sharing||String(invoices[0].status).toUpperCase()==="DRAFT"} onClick={()=>void shareInvoice(invoices[0],"draft")} className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50">Create Gmail draft</button><button disabled={!!sharing||String(invoices[0].status).toUpperCase()==="DRAFT"} onClick={()=>void shareInvoice(invoices[0],"send")} className="rounded-xl bg-[var(--invoice-accent)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">Send via Gmail</button><button disabled={!!sharing||String(invoices[0].status).toUpperCase()==="DRAFT"} onClick={()=>void shareInvoice(invoices[0],"whatsapp")} className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50">Share via WhatsApp</button></div><p className="mt-2 text-xs text-black/55">We attach the official Xero PDF. Gmail drafts are not sent automatically. WhatsApp lets you review the message and attach the PDF yourself.</p></div>}
        <div className="mt-6 flex flex-wrap gap-3">
          {invoices.length === 0 ? <><button disabled={busy || amount <= 0 || xeroConnected===null} onClick={() => void action(xeroConnected===false?"create_bms":"create")} className="rounded-xl bg-[var(--invoice-accent)] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{xeroConnected===false?"Convert to BMS invoice":xeroConnected===true?"Convert to Xero invoice":"Checking Xero connection..."}</button></> : invoices[0].provider==="bms" ? <><button disabled={busy||invoices[0].status!=="DRAFT"} onClick={()=>setConfirmAction("approve_bms")} className="rounded-xl bg-[var(--invoice-accent)] px-5 py-3 text-sm font-black text-white disabled:opacity-40">Approve BMS invoice</button><a href={`/bms-runtime/jobs/${encodeURIComponent(reference)}/invoice/${encodeURIComponent(invoices[0].id)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[var(--invoice-accent)] px-5 py-3 text-sm font-black text-white">Open / send invoice</a></> : <button disabled={busy} onClick={() => void action("sync")} className="rounded-xl bg-[var(--invoice-accent)] px-5 py-3 text-sm font-black text-white disabled:opacity-50">Refresh invoice status</button>}
        </div>
        {invoices.length === 0 && <p className="mt-4 text-sm leading-6 text-black/55">{amount<=0?"Add an agreed or quoted amount before creating the invoice.":"The BMS will create a draft invoice using your tenant branding and quote amount. If Xero is connected, the invoice is created in Xero; otherwise it is created directly in BMS. Approve it before sending."}</p>}
      </section>


      {invoices[0]&&<article className="invoice-sheet mt-5 hidden min-h-[1120px] flex-col bg-white p-14 text-[#171717] shadow-xl print:flex"><header className="flex items-start justify-between border-b-4 border-[var(--invoice-accent)] pb-6"><img src={crmConfig.logoUrl} alt={crmConfig.businessName} className="h-20 max-w-56 object-contain"/><div className="text-right"><h2 className="text-3xl font-black uppercase">Invoice</h2><p className="mt-1 font-black text-[var(--invoice-accent)]">{invoices[0].invoice_number||reference}</p><p className="mt-1 text-xs text-black/50">BMS reference {reference}</p>{invoices[0].invoice_date&&<p className="mt-1 text-xs text-black/50">Invoice date {new Date(`${invoices[0].invoice_date}T12:00:00`).toLocaleDateString("en-GB")}</p>}{invoices[0].due_date&&<p className="text-xs text-black/50">Due {new Date(`${invoices[0].due_date}T12:00:00`).toLocaleDateString("en-GB")}</p>}</div></header><section className="mt-8 grid grid-cols-2 gap-10"><div><p className="text-[10px] font-black uppercase tracking-wider text-[var(--invoice-accent)]">Bill to</p><p className="mt-2 text-lg font-black">{name}</p>{customer.email&&<p className="mt-1 text-sm text-black/60">{customer.email}</p>}{customer.phone&&<p className="text-sm text-black/60">{customer.phone}</p>}</div><div className="text-right"><p className="text-[10px] font-black uppercase tracking-wider text-black/40">Invoice total</p><p className="mt-2 text-3xl font-black">{money(invoices[0].total??amount)}</p><p className="mt-1 text-xs text-black/50">{crmConfig.businessDetails.vatRegistered?"VAT included where applicable":"VAT not charged"}</p></div></section><section className="mt-10 border-y border-black/10 py-6"><p className="text-xs font-black uppercase tracking-wider text-black/40">Description</p><p className="mt-2 text-sm leading-6">{invoiceDescription}</p></section><section className="mt-8 grid grid-cols-2 gap-8 text-sm"><div><p className="font-black">Payment details</p>{crmConfig.businessDetails.bankName&&<p className="mt-2">{crmConfig.businessDetails.bankName}</p>}{crmConfig.businessDetails.sortCode&&<p>Sort code: {crmConfig.businessDetails.sortCode}</p>}{crmConfig.businessDetails.accountNumber&&<p>Account: {crmConfig.businessDetails.accountNumber}</p>}</div><div className="text-right"><p><b>Paid:</b> {money(invoices[0].amount_paid)}</p><p><b>Amount due:</b> {money(invoices[0].amount_due)}</p></div></section><footer className="mt-auto border-t border-black/10 pt-5 text-[10px] leading-5 text-black/50"><p className="font-black text-black/70">{crmConfig.businessName}</p><p>{crmConfig.businessDetails.officeAddress}</p><p>{[crmConfig.businessDetails.phone,crmConfig.businessDetails.email,crmConfig.businessDetails.website,crmConfig.businessDetails.companyNumber?`Company No. ${crmConfig.businessDetails.companyNumber}`:"",crmConfig.businessDetails.vatRegistered&&crmConfig.businessDetails.vatNumber?`VAT ${crmConfig.businessDetails.vatNumber}`:""].filter(Boolean).join(" · ")}</p></footer></article>}
      <section style={{marginTop:20}} className="invoice-controls rounded-2xl border border-black/10 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-black">Xero invoice status</h2>
        {invoices.length === 0 ? <p className="mt-4 text-sm text-black/50">No Xero invoice has been created for this job yet.</p> : <div className="mt-4 space-y-3">{invoices.map((invoice) => <div key={invoice.id} className="rounded-xl border border-black/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">{invoice.invoice_number || "Xero draft"}</p><p className="mt-1 text-xs text-black/45">Status: {invoice.status} · Last synced {new Date(invoice.synced_at).toLocaleString("en-GB")}</p>{invoice.external_invoice_id&&<a href={`https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${encodeURIComponent(invoice.external_invoice_id)}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-bold underline text-[var(--invoice-accent)]">Open invoice in Xero</a>}</div><div className="text-right"><p className="font-black">{money(invoice.total)}</p><p className="text-xs text-black/45">Paid {money(invoice.amount_paid)} · Due {money(invoice.amount_due)}</p></div></div></div>)}</div>}
      </section>
    </div>
  </main>;
}
