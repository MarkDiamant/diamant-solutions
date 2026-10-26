"use client";
import {bmsMoney,bmsLocalInput,bmsQuoteScope} from "../../lib/presentation";
import {downloadQuotePdf,createQuotePdfBlob} from "./QuotePdfActions";


import { useEffect, useMemo, useState } from "react";
import { DEFAULT_CRM_CONFIG } from "@/lib/crm/config";

const money=bmsMoney;
const renderQuoteScope=bmsQuoteScope;

export default function QuotePrint({ reference, quoteId }: { reference: string; quoteId: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState("");
  const [sendConfirmation,setSendConfirmation]=useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [crmConfig,setCrmConfig]=useState(DEFAULT_CRM_CONFIG);
  const [connectedGmail,setConnectedGmail]=useState<string|null>(null);
  const [drafting,setDrafting]=useState(false);
  const [whatsAppBusy,setWhatsAppBusy]=useState(false);const [awaitingShareConfirmation,setAwaitingShareConfirmation]=useState(false);
  const [draftNotice,setDraftNotice]=useState<{email:string}|null>(null);
  useEffect(()=>{fetch("/api/admin/settings",{cache:"no-store"}).then(async r=>{if(r.ok){const b=await r.json();if(b.settings)setCrmConfig(b.settings);}}).catch(()=>{});fetch("/api/integrations/google/status",{cache:"no-store"}).then(async r=>{if(r.ok){const b=await r.json();if(b.connected&&b.email)setConnectedGmail(String(b.email));}}).catch(()=>{});},[]);
  useEffect(() => {
    fetch(`/api/admin/jobs/${encodeURIComponent(reference)}?quote=${encodeURIComponent(quoteId)}&t=${Date.now()}`, { cache: "no-store" }).then(async (res) => {
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      const body = await res.json();
      if (!res.ok) setError(body.error || "Could not load quote"); else setData(body);
    });
  }, [reference]);

  const quote = useMemo(() => data?.quotes?.find((q: any) => q.id === quoteId), [data, quoteId]);
  if (error) return <main className="p-10">{error}</main>;
  if (!data) return <main className="p-10">Loading quote...</main>;
  if (!quote) return <main className="p-10">Quote not found.</main>;

  const j = data.job, c = data.customer || {};
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  const site = [j.site_address_line_1 || c.address_line_1, j.site_address_line_2 || c.address_line_2, j.site_city || c.city, j.site_postcode || c.postcode].filter(Boolean).join(", ");
  // Job photos/files stay internal to the job record. Quotes and invoices never depend on them.
  const sender=String(data?.currentUser?.name||data?.user?.name||data?.admin?.name||data?.admin?.display_name||data?.currentAdmin?.name||"The Team").trim().split(/\s+/)[0];
  const business=String(crmConfig.businessName||"").replace(/\s+(?:Ltd\.?|Limited)\s*$/i,"").trim();
  const message = `Hi ${String(c.first_name||name||"there").trim().split(/\s+/)[0]},\n\nThank you for your enquiry. Please find attached our quotation ${j.reference} for ${String(j.job_title || j.job_type || "the work").toLowerCase()} at ${site}.\n\nIf you have any questions, please feel free to get in touch. We look forward to hearing from you.\n\nKind regards,\n${sender}\n${business}`;
  const template=crmConfig.quoteTemplate;
  const isClassic=false;
  const isModern=true;
  const pageClass=isClassic?"font-serif":isModern?"":"";
  const headerClass=isClassic?"border-b border-black pb-5":isModern?"border-b-4 border-[var(--brand)] pb-5":"border-b-[3px] border-[var(--brand)] pb-5";
  const panelClass=isClassic?"border-y border-black/20 py-5":isModern?"rounded-xl bg-[#f5f5f2] p-5":"rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/[0.035] p-5";

  async function markQuoteShared(){const r=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/share-quote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quoteId:quote.id})});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||"Unable to update quote status");setAwaitingShareConfirmation(false);setSentMessage("Quote marked as sent. Next action: Follow up quote.");}
  async function shareWhatsApp() {
    if(whatsAppBusy)return;
    const raw=String(c.mobile||c.mobile_phone||c.phone||"").trim();
    const digits=raw.replace(/[^\d+]/g,"");
    let number=digits.startsWith("+")?digits.slice(1):digits.startsWith("00")?digits.slice(2):digits.startsWith("0")?"44"+digits.slice(1):digits;
    if(!/^\d{8,15}$/.test(number))number="";
    const whatsappUrl="https://wa.me/"+number;
    const canNativeShare=typeof navigator.share==="function"&&typeof navigator.canShare==="function";
    const whatsappTab=canNativeShare?null:window.open("about:blank","_blank");
    setWhatsAppBusy(true);
    let copied=false;
    try {
      try {await navigator.clipboard.writeText(message);copied=true;} catch {}
      const blob=await createQuotePdfBlob();
      if(!blob||blob.size===0)throw Error("PDF generation returned an empty file");
      const filename=reference+"-Quote.pdf";
      const file=new File([blob],filename,{type:"application/pdf"});
      if(canNativeShare&&navigator.canShare({files:[file]})){
        try {
          await navigator.share({files:[file],title:"Quotation "+reference,text:message});
          await markQuoteShared();setSentMessage("Quote shared. Next action: Follow up quote.");
          return;
        } catch(error) {
          try {
            await navigator.share({files:[file],title:"Quotation "+reference});
            setAwaitingShareConfirmation(true);setSentMessage(copied?"PDF shared. Paste the copied quotation message into WhatsApp before sending. Then confirm below.":"PDF shared. Add the quotation message in WhatsApp before sending. Then confirm below.");
            return;
          } catch { console.warn("Native PDF share unavailable",error); }
        }
      }
      const objectUrl=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=objectUrl;link.download=filename;
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
      if(whatsappTab)whatsappTab.location.href=whatsappUrl;
      else window.open(whatsappUrl,"_blank");
      setAwaitingShareConfirmation(true);setSentMessage(copied?"WhatsApp opened. Attach the PDF, paste the message and confirm below once sent.":"WhatsApp opened. Attach the PDF and confirm below once sent.");
    } catch(error) {
      console.error("Quote PDF sharing failed",error);
      if(whatsappTab)whatsappTab.location.href=whatsappUrl;
      setSentMessage("Could not generate the quotation PDF. Please use Save PDF and try again.");
    } finally {setWhatsAppBusy(false);}
  }

  async function emailPdfPayload(){
    const blob=await createQuotePdfBlob();
    if(!blob||!blob.size)throw new Error("Quotation PDF could not be generated. Email was not sent.");
    const bytes=new Uint8Array(await blob.arrayBuffer());
    let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return {pdfBase64:btoa(binary),pdfName:reference+"-Quote-V"+quote.version+".pdf"};
  }

  async function sendQuote() {
    if (!c.email) { setSentMessage("Add the customer’s email address to the job before sending."); return; }
    setSendConfirmation(false);
    setSending(true); setSentMessage("");
    try {
    const pdf=await emailPdfPayload();
    const response = await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/send-quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: quote.id,...pdf }),
    });
    const body = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) { setSentMessage(body.error || "Unable to send quotation by email."); return; }
    setSentMessage(`Quotation emailed to ${body.sentTo||c.email}, with its PDF attached.`);
    }catch(error){setSending(false);setSentMessage(error instanceof Error?error.message:"Could not prepare quotation PDF.");}
  }

  async function savePdf(){setPdfBusy(true);try{await downloadQuotePdf(reference);}catch(error){try{const res=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/quotes/${encodeURIComponent(quote.id)}/pdf?fresh=${Date.now()}`,{cache:"no-store"});if(!res.ok)throw new Error((await res.json().catch(()=>({}))).error||"PDF download failed");const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${reference}-Quote-V${quote.version}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(fallback){alert("Could not save PDF: "+(fallback instanceof Error?fallback.message:String(fallback)));}}finally{setPdfBusy(false);}}

  return <><main className="min-h-screen overflow-x-auto bg-[#ecece8] py-6 text-[#171717] print:bg-white print:py-0" style={{"--brand":crmConfig.accentColour} as React.CSSProperties}>
    <style>{`@media screen and (max-width: 899px) { .quote-page { zoom: calc(100vw / 900px); } } @media print { @page { size: A4; margin: 0; } .quote-page { width: 210mm; min-height: 297mm; box-shadow: none !important; break-after: page; page-break-after: always; } .quote-page:last-child { break-after: auto; page-break-after: auto; } }`}</style>
    <div className="quote-action-bar mx-auto mb-3 flex w-full max-w-[900px] flex-wrap items-center justify-center gap-1.5 px-2 text-center print:hidden">
      {sendConfirmation && <div role="presentation" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4"><div role="dialog" aria-modal="true" aria-labelledby="quote-send-title" className="w-full max-w-md overflow-hidden rounded-2xl bg-white text-left shadow-2xl"><div className="h-2" style={{backgroundColor:crmConfig.accentColour||"#e66a24"}}/><div className="p-6"><div className="mb-4 flex items-center gap-3">{crmConfig.logoUrl?<img src={crmConfig.logoUrl} alt={business} className="max-h-14 max-w-36 object-contain"/>:<span className="text-lg font-bold" style={{color:crmConfig.accentColour}}>{business}</span>}</div><h2 id="quote-send-title" className="text-xl font-bold text-[#171717]">Send quotation by email?</h2><p className="mt-3 text-sm leading-6 text-[#333]">Send quotation <strong>{j.reference} V{quote.version}</strong> to <strong className="break-all">{c.email}</strong> with the PDF attached?</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setSendConfirmation(false)} className="rounded-lg border-2 border-gray-700 bg-gray-200 px-5 py-2.5 font-bold text-gray-950 hover:bg-gray-300">Cancel</button><button type="button" onClick={()=>{setSendConfirmation(false);void sendQuote();}} className="rounded-lg px-5 py-2.5 font-bold text-white" style={{backgroundColor:crmConfig.accentColour||"#e66a24"}}>Send quotation</button></div></div></div></div>}
      {sentMessage && <div role="status" aria-live="polite" className="fixed left-1/2 top-1/2 z-[100] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-green-200 bg-white px-4 py-4 text-left text-sm font-medium text-green-800 shadow-2xl"><div className="flex items-start gap-3"><span className="flex-1">{sentMessage}</span>{awaitingShareConfirmation&&<button type="button" onClick={()=>void markQuoteShared().catch(e=>setSentMessage(String(e)))} className="rounded-lg bg-green-800 px-3 py-2 font-bold text-white">I sent it</button>}<button type="button" onClick={()=>{setSentMessage("");setAwaitingShareConfirmation(false)}} aria-label="Close notification" className="shrink-0 rounded-lg border border-green-800 bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900">OK</button></div></div>}
      <button onClick={()=>void savePdf()} disabled={pdfBusy} className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--brand)] px-3 text-sm font-medium leading-none text-white disabled:opacity-60">{pdfBusy ? "Saving PDF..." : "Save PDF"}</button>
      <button onClick={() => {if(!c.email){setSentMessage("Add the customer’s email address to the job before sending.");return;}setSendConfirmation(true);}} disabled={sending} className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--brand)] px-3 text-sm font-medium leading-none text-white disabled:opacity-50">{sending ? "Sending..." : "Send quote by email"}</button>
      <button type="button" disabled={drafting} onClick={async()=>{setDrafting(true);try{const pdf=await emailPdfPayload();const response=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/draft-quote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quoteId:quote.id,...pdf})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||"Could not create Gmail draft");setDraftNotice(null);setSentMessage("Email draft saved to "+(body.from||connectedGmail||"your connected Gmail account")+" with the quotation PDF attached. You can review and send it from Gmail when ready.");}catch(error){setSentMessage(error instanceof Error?error.message:"Could not create Gmail draft");}finally{setDrafting(false);}}} className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--brand)] px-3 text-sm font-medium leading-none text-white disabled:opacity-50">{drafting?"Creating Gmail draft...":"Create Gmail draft"}</button>
      <button onClick={() => void shareWhatsApp()} disabled={whatsAppBusy} className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--brand)] px-3 text-sm font-medium leading-none text-white disabled:opacity-50">{whatsAppBusy?"Preparing WhatsApp...":"Share via WhatsApp"}</button>
      <a href={`/admin/jobs/${reference}`} className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--brand)] px-3 text-sm font-medium leading-none text-white">Back to job</a><a href="/admin" className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--brand)] px-3 text-sm font-medium leading-none text-white">Back to admin</a>
    </div>

    <article className={`quote-page ${pageClass} relative z-0 mx-auto flex min-h-[1120px] w-[900px] min-w-[900px] max-w-none flex-col bg-white px-10 py-9 shadow-xl sm:px-14 hidden`}>
      <header className={`flex items-start justify-between gap-8 ${headerClass}`}>
        <div><img src={crmConfig.logoUrl} alt={crmConfig.businessName} className="h-20 w-auto object-contain" /></div>
        <div className="text-right"><h1 className="max-w-[430px] text-2xl font-black uppercase tracking-tight">{"Quotation"}</h1><p className="mt-1 text-lg font-black text-[var(--brand)]">{isModern ? j.reference : `${j.reference} / V${quote.version}`}</p><p className="mt-1 text-xs text-black/55">Issued {new Date(quote.created_at).toLocaleDateString("en-GB")}{quote.valid_until ? ` · Valid until ${new Date(`${quote.valid_until}T12:00:00`).toLocaleDateString("en-GB")}` : ""}</p></div>
      </header>

      <section className="mt-6 grid gap-6 grid-cols-2">
        <div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">{"Client Information"}</p><p className="mt-1 text-lg font-black">{name}</p>{site && <p className="mt-1 text-sm leading-5 text-black/65">{site}</p>}{c.phone && <p className="mt-1 text-xs text-black/55">{c.phone}</p>}{c.email && <p className="text-xs text-black/55">{c.email}</p>}</div>
        <div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">{"Project Overview & Lead Times"}</p><p className="mt-1 text-lg font-black">{j.job_title||j.job_type}</p>{j.dimensions && <p className="mt-1 text-sm text-black/65">Approx. dimensions: {j.dimensions}</p>}{j.material && <p className="text-sm text-black/65">Material: {j.material}</p>}{(j.finishes || []).length > 0 && <p className="text-sm text-black/65">Finish: {(j.finishes || []).join(" + ")}{j.colour ? `, ${j.colour}` : ""}</p>}</div>
      </section>

      {!isModern && <section className="mt-6"><h2 className="border-b border-[var(--brand)]/25 pb-2 text-base font-black text-[var(--brand)]">Scope of works</h2><div className="mt-4 whitespace-normal text-[14px] leading-6 text-black/75">{renderQuoteScope(quote.scope_text)}</div></section>}

      

      {!isModern && <section className={`mt-auto ${panelClass}`}><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-black/45">Quotation total</p><p className="mt-1 text-3xl font-black">{money(quote.amount)}</p><p className="mt-1 text-[10px] text-black/45">{crmConfig.businessDetails.vatRegistered&&Number(quote.vat_rate||0)>0?`VAT ${Number(quote.vat_rate)}%`:"VAT not charged"}</p></div><div className="min-w-0 max-w-[48%] shrink-0 break-words text-right text-[12px] leading-5 text-black/60">{Number(quote.deposit_amount)>0&&Number(quote.amount)>0&&<p><b>Deposit:</b> {money(quote.deposit_amount)}</p>}{quote.lead_time && <p><span className="font-semibold">Lead time:</span> <span className="whitespace-normal">{quote.lead_time}</span></p>}</div></div></section>}
      <footer className="mt-4 text-[10px] leading-4 text-black/45">{crmConfig.businessName}{crmConfig.businessDetails.companyNumber?` · Company No. ${crmConfig.businessDetails.companyNumber}`:""}{crmConfig.businessDetails.phone?` · ${crmConfig.businessDetails.phone}`:""}{crmConfig.businessDetails.email?` · ${crmConfig.businessDetails.email}`:""}{crmConfig.businessDetails.website?` · ${crmConfig.businessDetails.website}`:""}</footer>
    </article>

    <article className={`quote-page ${pageClass} mx-auto mt-0 flex min-h-[1120px] w-[900px] min-w-[900px] max-w-none flex-col bg-white px-10 pt-4 pb-9 shadow-xl print:mt-0 sm:px-14`}>
      <header className={`flex h-[40px] items-center justify-between gap-5 ${isClassic?"border-b border-black pb-4":isModern?"border-b-4 border-[var(--brand)] pb-0":"border-b-2 border-[var(--brand)] pb-4"}`}><div className="relative top-[5px] flex h-[30px] min-w-0 max-w-[45%] items-center justify-start self-center"><img src={crmConfig.logoUrl} alt={crmConfig.businessName} className="block max-h-[30px] max-w-full w-auto object-contain object-left"/></div><div className="relative -top-[5px] flex h-[30px] min-w-0 flex-col items-end justify-center self-center text-right"><p className="font-black">{isModern ? j.reference : `${j.reference} / V${quote.version}`}</p><p className="text-xs text-black/45">Quotation details</p></div></header>{isModern&&<section className="mt-5 grid gap-6 grid-cols-2"><div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">Client Information</p><p className="mt-1 text-base font-black">{name}</p>{site&&<p className="mt-1 text-xs leading-5 text-black/65">{site}</p>}{(c.phone||c.email)&&<p className="mt-1 text-xs text-black/55">{c.phone}{c.phone&&c.email&&" · "}{c.email}</p>}</div><div className="text-right"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">Project</p><p className="mt-1 text-base font-black">{j.job_title||(Array.isArray(j.job_types)&&j.job_types.length?j.job_types.join(", "):j.job_type)}</p><p className="mt-1 text-xs text-black/55">Issued {new Date(quote.created_at).toLocaleDateString("en-GB")}{quote.valid_until?` · Valid until ${new Date(`${quote.valid_until}T12:00:00`).toLocaleDateString("en-GB")}`:""}</p></div></section>}
      {isModern && <div aria-hidden="true" style={{height:20,flexShrink:0}} />}{isModern && <section className={`mt-0 mb-0 ${panelClass}`}><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-black/45">Quotation total</p><p className="mt-1 text-3xl font-black">{money(quote.amount)}</p><p className="mt-1 text-[10px] text-black/45">{crmConfig.businessDetails.vatRegistered&&Number(quote.vat_rate||0)>0?`VAT ${Number(quote.vat_rate)}%`:"VAT not charged"}</p></div><div className="min-w-0 max-w-[48%] shrink-0 break-words text-right text-[12px] leading-5 text-black/60">{Number(quote.deposit_amount)>0&&Number(quote.amount)>0&&<p><b>Deposit:</b> {money(quote.deposit_amount)}</p>}{quote.lead_time && <p><span className="font-semibold">Lead time:</span> <span className="whitespace-normal">{quote.lead_time}</span></p>}</div></div></section>}
      {isModern && <div aria-hidden="true" style={{height:20,flexShrink:0}} />}{isModern && <section className="mt-0"><h2 className="border-b border-black/15 pb-1.5 text-base font-black">Scope of Works</h2><div className="mt-3 whitespace-normal text-[14px] leading-6 text-black/75">{renderQuoteScope(quote.scope_text)}</div></section>}
      {quote.exclusions && <section className="mt-10 pt-5 border-t border-black/10"><h2 className="text-base font-black">{isModern ? "Project Specific Exclusions" : "Project notes"}</h2><div className="mt-2 whitespace-pre-wrap text-sm leading-5 text-black/70">{quote.exclusions}</div></section>}
      {isModern ? <section className="mt-auto pt-8"><h2 className="text-base font-black">Payment & Terms</h2><div className="mt-3 rounded-xl border border-black/10 bg-[#fafaf8] p-5 text-[13px] leading-6 text-black/70"><p><b>Payment:</b> {quote.deposit_amount ? `${Number(quote.amount)>0?`${Math.round(Number(quote.deposit_amount)/Number(quote.amount)*10000)/100}%`:"Agreed"} deposit, with the balance due on completion.` : crmConfig.businessDetails.paymentTerms}</p><p className="mt-2"><b>Terms:</b> Quote valid for {crmConfig.businessDetails.quoteValidityDays} days. Final site measurements apply. Any additional or changed work will be agreed separately. Lead times are estimates and may change due to access, materials or circumstances outside our control. Fabricated items remain our property until paid in full.</p>{crmConfig.businessDetails.bankName&&<div className="mt-3 border-t border-black/10 pt-3 text-[14px] leading-6 text-black/80"><p className="font-black">Bank details</p><p>Account name: {crmConfig.businessDetails.bankName}</p><p>Sort code: {crmConfig.businessDetails.sortCode}</p><p>Account number: {crmConfig.businessDetails.accountNumber}</p></div>}</div></section> : <section className="mt-6"><h2 className="text-base font-black">Payment & key terms</h2><div className="mt-3 grid gap-x-8 gap-y-2 text-[12px] leading-5 text-black/65 grid-cols-2"><p><b>Payment:</b> {quote.deposit_amount ? `${money(quote.deposit_amount)} deposit. ${crmConfig.businessDetails.paymentTerms.replace(/^\s*\d+(?:\.\d+)?%\s+deposit\s*,?\s*/i,"")}` : crmConfig.businessDetails.paymentTerms}</p><p><b>Validity:</b> This quotation is valid for {crmConfig.businessDetails.quoteValidityDays} days unless another validity date is shown above.</p><p><b>Scope:</b> The price covers only the works specifically described in this quotation. Additional or changed works will be agreed separately.</p><p><b>Measurements:</b> Final site measurements take precedence over preliminary dimensions.</p><p><b>Lead times:</b> Dates and lead times are estimates and may change due to access, materials or circumstances outside our control.</p><p><b>Ownership:</b> Fabricated items remain the property of the supplier until paid for in full.</p></div></section>}
{isModern&&<p className="mt-7 mb-5 w-full text-center text-[14px] font-semibold leading-6 text-black/65">To proceed, please confirm your acceptance of this quotation. Thank you for the opportunity to quote for your project.<span className="block">We look forward to working with you.</span></p>}{!isModern&&<section className="mt-7"><h2 className="text-base font-black">Acceptance</h2><p className="mt-2 text-sm leading-5 text-black/65">I/We accept this quotation and authorise {crmConfig.businessName} to proceed with the works described.</p><div className="mt-8 grid grid-cols-3 gap-5 text-xs"><div className="border-t border-black/35 pt-2">Name</div><div className="border-t border-black/35 pt-2">Signature</div><div className="border-t border-black/35 pt-2">Date</div></div></section>}
      <footer style={isModern?{backgroundColor:crmConfig.accentColour||"#e66a24"}:undefined} className={isModern?"mt-auto rounded-2xl px-2 py-2.5 text-center text-[14px] font-medium leading-6 text-white":"mt-auto border-t border-black/10 pt-4 text-[10px] leading-4 text-black/45"}>{isModern?<><p><strong className="text-[14px] font-semibold">{crmConfig.businessName}</strong>{crmConfig.businessDetails.officeAddress?` · ${crmConfig.businessDetails.officeAddress}`:""}</p><p>{[crmConfig.businessDetails.phone,crmConfig.businessDetails.email,crmConfig.businessDetails.website,crmConfig.businessDetails.companyNumber?`Company No. ${crmConfig.businessDetails.companyNumber}`:"",crmConfig.businessDetails.vatRegistered&&crmConfig.businessDetails.vatNumber?`VAT ${crmConfig.businessDetails.vatNumber}`:""].filter(Boolean).join(" · ")}</p></>:<><p className="font-bold text-black/60">{crmConfig.businessName.toUpperCase()}</p><p>{crmConfig.businessDetails.officeAddress}</p><p>{[crmConfig.businessDetails.phone,crmConfig.businessDetails.email,crmConfig.businessDetails.website,crmConfig.businessDetails.companyNumber?`Company No. ${crmConfig.businessDetails.companyNumber}`:"",crmConfig.businessDetails.vatRegistered&&crmConfig.businessDetails.vatNumber?`VAT ${crmConfig.businessDetails.vatNumber}`:""].filter(Boolean).join(" · ")}</p>{crmConfig.businessDetails.bankName&&<p className="mt-1">Payment: {crmConfig.businessDetails.bankName} · Sort code {crmConfig.businessDetails.sortCode} · Account {crmConfig.businessDetails.accountNumber}</p>}</>}</footer>
    </article>
    <span className="hidden" data-pdf-status-listener onClick={() => setPdfBusy(false)} />
  </main>{draftNotice&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 print:hidden"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand)] text-xl font-black text-white">✓</div><h2 className="text-xl font-black">Email draft created</h2><p className="mt-2 text-sm leading-6 text-black/60">Draft created in <strong className="text-black">{draftNotice.email}</strong> with the quotation PDF attached.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setDraftNotice(null)} className="rounded-lg bg-[var(--brand)] px-2.5 py-2 text-xs font-bold text-white sm:px-3 sm:text-sm">Close</button><button type="button" onClick={()=>{window.open(`https://mail.google.com/mail/u/?authuser=${encodeURIComponent(draftNotice.email)}#drafts`,"_blank","noopener,noreferrer");setDraftNotice(null);}} className="rounded-lg bg-[var(--brand)] px-2.5 py-2 text-xs font-black text-white sm:px-3 sm:text-sm">Open Gmail</button></div></div></div>}</>;
}
