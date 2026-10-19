"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CRM_CONFIG } from "@/lib/crm/config";

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value || 0));
}

export default function QuotePrint({ reference, quoteId }: { reference: string; quoteId: string }) {
  const [data, setData] = useState<any>(null);
  const [crmConfig,setCrmConfig]=useState(DEFAULT_CRM_CONFIG);
  const printableRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    if(!data)return;
    let frame=0;
    const fit=()=>{
      const page=printableRef.current;
      const body=page?.querySelector<HTMLElement>("[data-quote-body]");
      if(!page||!body)return;
      const paddingTop=parseFloat(getComputedStyle(page).paddingTop)||0;
      const paddingBottom=parseFloat(getComputedStyle(page).paddingBottom)||0;
      const footer=page.querySelector<HTMLElement>(".quote-modern-footer");
      const footerTop=footer?footer.offsetTop:page.clientHeight-paddingBottom-55;
      const available=footerTop-paddingTop-36;
      const measure=()=>body.offsetHeight*Number(page.style.getPropertyValue("--quote-fit")||1);
      page.style.setProperty("--quote-fit","1");
      if(measure()>available){
        let low=.45,high=1;
        for(let n=0;n<16;n++){
          const mid=(low+high)/2;
          page.style.setProperty("--quote-fit",String(mid));
          if(measure()<=available)low=mid;
          else high=mid;
        }
        page.style.setProperty("--quote-fit",String(low));
      }
      page.dataset.quoteFit=measure()<=available+1?"fitted":"overflow";
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);};
    const beforePrint=()=>{fit();};
    window.addEventListener("beforeprint",beforePrint);
    window.addEventListener("afterprint",schedule);
    schedule();
    const observer=new ResizeObserver(schedule);
    if(printableRef.current)observer.observe(printableRef.current);
    document.fonts?.ready.then(schedule).catch(()=>{});
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener("beforeprint",beforePrint);window.removeEventListener("afterprint",schedule);};
  },[data,crmConfig,quoteId]);

  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  const [connectedGmail,setConnectedGmail]=useState<string|null>(null);
  const [drafting,setDrafting]=useState(false);
  const [whatsAppBusy,setWhatsAppBusy]=useState(false);
  const [draftNotice,setDraftNotice]=useState<{email:string}|null>(null); const [dialog,setDialog]=useState<{title:string;message:string}|null>(null);
  useEffect(()=>{fetch("/api/admin/settings",{cache:"no-store"}).then(async r=>{if(r.ok){const b=await r.json();if(b.settings)setCrmConfig(b.settings);}}).catch(()=>{});fetch("/api/admin/integrations/google/status",{cache:"no-store"}).then(async r=>{if(r.ok){const b=await r.json();if(b.connected&&b.email)setConnectedGmail(String(b.email));}}).catch(()=>{});},[]);
  useEffect(()=>{const handler=async(ev:Event)=>{const detail=(ev as CustomEvent).detail||{};try{const response=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/draft-quote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quoteId,pdfBase64:detail.pdfBase64,pdfName:detail.pdfName})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||"Could not create Gmail draft");setDraftNotice({email:body.from||connectedGmail||"connected Gmail"});}catch(error){setDialog({title:"Could not create email draft",message:error instanceof Error?error.message:"Could not create Gmail draft"});}finally{setDrafting(false);}};window.addEventListener("quote-email-pdf",handler);return()=>window.removeEventListener("quote-email-pdf",handler);},[reference,quoteId,connectedGmail]);
  useEffect(()=>{const handler=async(ev:Event)=>{const detail=(ev as CustomEvent).detail||{};try{if(!detail.pdfBase64)throw new Error("Quote PDF could not be generated");const response=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/send-quote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quoteId,pdfBase64:detail.pdfBase64,pdfName:detail.pdfName})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||"Could not send quote");setSentMessage(`Sent to ${body.sentTo||"customer"}`);}catch(error){setDialog({title:"Could not send quote",message:error instanceof Error?error.message:"Could not send quote"});}finally{setSending(false);}};window.addEventListener("quote-send-pdf",handler);return()=>window.removeEventListener("quote-send-pdf",handler);},[reference,quoteId]);
  useEffect(() => {
    fetch(`/api/admin/jobs/${encodeURIComponent(reference)}`, { cache: "no-store" }).then(async (res) => {
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      const body = await res.json();
      if (!res.ok) setError(body.error || "Could not load quote"); else setData(body);
    });
  }, [reference]);

  const quote = useMemo(() => data?.quotes?.find((q: any) => q.id === quoteId), [data, quoteId]);
  useEffect(()=>{const onShared=async()=>{try{const res=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/share-quote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quoteId})});const body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(body.error||"Could not update job");setSentMessage("Quote shared via WhatsApp. Job updated; follow-up scheduled.");}catch{setSentMessage("WhatsApp share completed, but job status could not be updated.");}};window.addEventListener("quote-whatsapp-shared",onShared);return()=>window.removeEventListener("quote-whatsapp-shared",onShared);},[reference,quoteId]);
  if (error) return <main className="p-10">{error}</main>;
  if (!data) return <main className="p-10">Loading quote...</main>;
  if (!quote) return <main className="p-10">Quote not found.</main>;

  const j = data.job, c = data.customer || {};
  const name = String(c.company || c.company_name || "").trim() || [c.first_name, c.last_name].filter(Boolean).join(" ");
  const greetingFirstName = String(c.first_name || "").trim().split(/\s+/)[0] || "there";
  const site = [j.site_address_line_1 || c.address_line_1, j.site_address_line_2 || c.address_line_2, j.site_city || c.city, j.site_postcode || c.postcode].filter(Boolean).join(", ");
  // Job photos/files stay internal to the job record. Quotes and invoices never depend on them.
  const message = `Hi ${greetingFirstName},

Please find our quotation ${j.reference} for ${String(j.job_type || "metalwork").toLowerCase()} at ${site}.

Quotation: ${money(quote.amount)}

Kind regards,
${crmConfig.businessName}`;
  const template=crmConfig.quoteTemplate;
  const isClassic=template==="classic";
  const isMj=template==="mj-signature";
  const isMjTenant=String(crmConfig.businessName||"").trim().toLowerCase()==="m&j metal";
  const displayScope=(value:string)=>String(value||"")
    .replace(/(?:^|\n)([^\n]*?)\b1\s*[x×]\s*£([\d,]+(?:\.\d{1,2})?)\s*=\s*£([\d,]+(?:\.\d{1,2})?)/gi,(_m,prefix,_unit,total)=>"\n"+prefix.trimEnd().replace(/[\s:|.-]+$/,"")+": £"+total)
    .replace(/(?:^|\n)([^\n]*?)\b1\s*[x×]\s*£([\d,]+(?:\.\d{1,2})?)/gi,(_m,prefix,price)=>"\n"+prefix.trimEnd().replace(/[\s:|.-]+$/,"")+": £"+price)
    .trim();
  const scopeParts=(value:string)=>{
    const cleaned=displayScope(value);
    const lines=cleaned.split(/\n/).map(x=>x.trim()).filter(Boolean);
    const priceLine=(line:string)=>/£[\d,]+(?:\.\d{1,2})?/.test(line);
    const groups:{description:string;price:string}[]=[];
    let descriptions:string[]=[];
    for(const line of lines){
      if(priceLine(line)){
        groups.push({description:descriptions.join(" "),price:line.replace(/^\s*\d+[.)]\s*/,"")});
        descriptions=[];
      }else descriptions.push(line.replace(/^\s*\d+[.)]\s*/,""));
    }
    if(descriptions.length&&groups.length)groups[groups.length-1].description+=" "+descriptions.join(" ");
    if(groups.length===0)return [{description:cleaned,price:""}];
    return groups;
  };
  const quoteProjectTitle=(jobTitle:string,_scope:string)=>jobTitle.trim()||"Project";
  const renderBold=(value:string)=>String(value||"").split(/(\*\*[^*\n]+\*\*)/g).map((part,i)=>part.startsWith("**")&&part.endsWith("**")?<strong key={i} className="font-black text-black">{part.slice(2,-2)}</strong>:part);
  const renderScope=(value:string)=>{
    const groups=scopeParts(value);
    return <div className="space-y-3">{groups.map((group,index)=><div key={index} className="space-y-2" style={{paddingLeft:groups.length>1?"25px":0}}>
      <p className="whitespace-pre-wrap">{groups.length>1?<span style={{fontWeight:900,display:"inline-block",width:"25px",marginLeft:"-25px",color:"#111"}}>{index+1}.</span>:null}{(()=>{const match=group.description.match(/^([^:]{3,80}):\s*(.+)$/s);return match?<><strong className="font-black text-black">{renderBold(match[1])}:</strong>{" "}{renderBold(match[2])}</>:renderBold(group.description);})()}</p>
      {group.price&&<p style={{fontWeight:900,color:"#111",marginTop:"5px",marginBottom:"9px"}}><b style={{fontWeight:900}}>{group.price}</b></p>}
    </div>)}</div>;
  };
  const formatNumberedScope=(value:string)=>scopeParts(value).map((g,i)=>(scopeParts(value).length>1?(i+1)+". ":"")+g.description+(g.price?"\n"+g.price:"")).join("\n\n");
  const scopeLength=String(quote?.scope_text||"").length+String(crmConfig.quoteDefaultText||"").length+(isMjTenant?420:0);
  const scopeFontSize=15;
  const scopeTypography={fontSize:scopeFontSize+"px",lineHeight:Math.round(scopeFontSize*1.5)+"px"};
  const mjCompletionText="All works will be carried out to a professional standard. Installation includes the agreed fixings and fittings, final checks where applicable, removal of waste generated by our works, and leaving the work area clean and tidy. Areas directly affected by installation will be made good to a neat finish where reasonably practicable. Any additional works will be agreed separately.";
  // The polished quote is the shared BMS default. Tenants inherit the layout; branding/data stay tenant-specific.
  const isModern=!isClassic;
  const pageClass=isClassic?"font-serif":isMj?"":"";
  const quoteBrand=crmConfig.accentColour || "#1f4f78";
  const tenantLogoSrc="/api/business-software/tenant-logo";
  const logoImgClass="object-contain";
  const headerClass=isClassic?"border-b border-black pb-5":isMj?"border-b-4 border-[var(--brand)] pb-5":"border-b-2 border-[var(--brand)] pb-5";
  const panelClass=isClassic?"border-y border-black/20 py-5":"rounded-xl bg-[#f5f5f2] p-5";

  async function shareWhatsApp() {
    if(whatsAppBusy)return;
    setWhatsAppBusy(true);
    try{
      const customerName=String(c.first_name||"").trim().split(/\s+/)[0];
      const shortMessage=`Hi${customerName?" "+customerName:""}, please find your quote attached. If you have any questions or would like to go ahead and book the work in, just let us know. Many thanks!`;
      await navigator.clipboard.writeText(shortMessage);
      setSentMessage("Message copied. Paste it into WhatsApp.");
      document.documentElement.dataset.quoteShare="whatsapp";
      document.getElementById("save-quote-pdf")?.click();
    }catch(error){delete document.documentElement.dataset.quoteShare;alert(error instanceof Error?error.message:"Could not prepare WhatsApp share");}
    finally{setWhatsAppBusy(false);}
  }



  async function sendQuote() {
    if (!c.email) { alert("Add the customer's email address to the job first."); return; }
    if (!window.confirm(`Send quotation ${j.reference} V${quote.version} to ${c.email}?`)) return;
    setSending(true); setSentMessage("");
    document.documentElement.dataset.quoteEmailPdf="send";
    document.getElementById("save-quote-pdf")?.click();
  }

  return <><main className="min-h-screen bg-[#ecece8] py-6 text-[#171717] print:bg-white print:py-0" style={{"--brand":quoteBrand} as React.CSSProperties}>
    <style>{`
      .quote-page { width: 794px; min-width: 794px; }\n      .quote-fit-body { zoom: var(--quote-fit, 1); width: 100%; box-sizing: border-box; word-spacing: 1.4px; letter-spacing: normal; }
      .quote-preview-scroll { overflow: auto; padding: 0 8px 24px; -webkit-overflow-scrolling: touch; }
      .quote-mobile-frame { width: 794px; max-width: 794px; transform-origin: top center; }
      @media (max-width: 932px) {
        .quote-preview-scroll { padding-left: 8px; padding-right: 8px; }
        .quote-mobile-frame { transform-origin: top left; transform: scale(.4); margin-bottom: -672px; }
        .quote-page { width: 794px !important; min-width: 794px !important; max-width: 794px !important; padding-left: 30px !important; padding-right: 30px !important; }
      }
      @media print { @page { size: A4; margin: 0; } .quote-preview-scroll { overflow: visible !important; padding: 0 !important; } .quote-mobile-frame { width: 210mm !important; max-width: 210mm !important; transform: none !important; margin: 0 !important; } .quote-page { box-sizing: border-box !important; width: 210mm !important; min-width: 210mm !important; max-width: 210mm !important; height: 297mm !important; min-height: 297mm; padding-left: 8mm !important; padding-right: 8mm !important; padding-top: 7mm !important; padding-bottom: 12mm !important; overflow: hidden !important; position: relative !important; box-shadow: none !important; break-after: page; page-break-after: always; } .quote-page .quote-fit-body { width: 100% !important; } .quote-page .quote-modern-footer { height: 20px !important; min-height: 20px !important; max-height: 20px !important; position: absolute !important; bottom: 8mm !important; left: 10mm !important; right: 10mm !important; margin-top: 0 !important; margin-bottom: 0 !important; padding: 0 12px !important; border-radius: 9px !important; display: flex !important; flex-direction: column !important; gap: 0 !important; align-items: center !important; justify-content: center !important; } .quote-page .quote-modern-footer p { margin: 0 !important; padding: 0 !important; line-height: 9px !important; height: 9px !important; min-height: 0 !important; flex: 0 0 9px !important; text-align: center !important; } .quote-page:last-child { break-after: auto; page-break-after: auto; } }
    `}</style>
    <div className="mx-auto mb-4 flex max-w-[900px] flex-wrap items-center justify-end gap-2 px-4 print:hidden">
      {sentMessage && <span className="self-center rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-700">{sentMessage}</span>}
      <button onClick={() => { setPdfBusy(true); document.getElementById("save-quote-pdf")?.click(); }} disabled={pdfBusy} className="rounded-xl px-4 py-2.5 text-sm font-black text-white shadow-sm disabled:opacity-50" style={{backgroundColor:quoteBrand}}>{pdfBusy ? "Saving PDF..." : "Save PDF"}</button>
      <button onClick={() => void sendQuote()} disabled={sending||!connectedGmail} title={connectedGmail?"Send directly from connected Gmail":"Connect Gmail in Integrations to send directly"} className="rounded-xl px-4 py-2.5 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-35" style={{backgroundColor:quoteBrand}}>{sending ? "Sending..." : "Send quote by email"}</button>
      <button type="button" disabled={drafting||!connectedGmail} title={connectedGmail?"Create a draft in connected Gmail":"Connect Gmail in Integrations to create drafts"} onClick={()=>{setDrafting(true);document.documentElement.dataset.quoteEmailPdf="1";document.getElementById("save-quote-pdf")?.click();}} className="rounded-xl px-4 py-2.5 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-35" style={{backgroundColor:quoteBrand}}>{drafting?"Creating Gmail draft...":"Open email draft"}</button>
      <button onClick={() => void shareWhatsApp()} disabled={whatsAppBusy} className="rounded-xl px-4 py-2.5 text-sm font-black text-white shadow-sm disabled:opacity-50" style={{backgroundColor:quoteBrand}}>{whatsAppBusy?"Preparing WhatsApp...":"Share via WhatsApp"}</button>
      <a href={`/admin/jobs/${reference}`} className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-black shadow-sm hover:bg-black/[0.03]">Back to job</a>
    </div>

    <article className={`quote-page ${pageClass} mx-auto flex min-h-[1120px] max-w-[900px] flex-col bg-white px-10 py-9 shadow-xl sm:px-14 hidden`}>
      <header className={`flex items-start justify-between gap-8 ${headerClass}`}>
        <div>{tenantLogoSrc&&<img src={tenantLogoSrc} alt={crmConfig.businessName} className={isMj?"h-20 w-auto max-w-[280px] object-contain":"h-20 w-auto object-contain"} />}</div>
        <div className="text-right"><h1 className="max-w-[430px] text-2xl font-black uppercase tracking-tight">{isMj ? "Project Proposal" : "Quotation"}</h1><p className="mt-1 text-lg font-black text-[var(--brand)]">{isMj ? j.reference : `${j.reference} / V${quote.version}`}</p><p className="mt-1 text-xs text-black/55">Issued {new Date(quote.sent_at || quote.issued_at || (quote.status === "sent" ? (quote.updated_at || quote.created_at) : new Date().toISOString())).toLocaleDateString("en-GB",{timeZone:"Europe/London"})}{quote.valid_until ? ` · Valid until ${new Date(`${quote.valid_until}T12:00:00`).toLocaleDateString("en-GB")}` : ""}</p></div>
      </header>

      {isMj && <p className="mt-3 text-xs font-black text-[var(--brand)]">Built Strong. Built to Last.</p>}<section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">{isMj ? "Client Information" : "Client"}</p><p className="mt-1 text-lg font-black">{name}</p>{site && <p className="mt-1 text-sm leading-5 text-black/65">{site}</p>}{c.phone && <p className="mt-1 text-xs text-black/55">{c.phone}</p>}{c.email && <p className="text-xs text-black/55">{c.email}</p>}</div>
        <div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">{isMj ? "Project Overview & Lead Times" : "Project"}</p><p className="mt-1 text-lg font-black">{quoteProjectTitle(String(j.job_type||"Project"),String(quote.scope_text||""))}</p>{j.dimensions && <p className="mt-1 text-sm text-black/65">Approx. dimensions: {j.dimensions}</p>}{j.material && <p className="text-sm text-black/65">Material: {j.material}</p>}{(j.finishes || []).length > 0 && <p className="text-sm text-black/65">Finish: {(j.finishes || []).join(" + ")}{j.colour ? `, ${j.colour}` : ""}</p>}</div>
      </section>

      {!isMj && <section className="mt-6"><h2 className="border-b border-black/15 pb-1.5 text-base font-black">Scope of works</h2><div className="mt-3 whitespace-pre-wrap text-[14px] leading-6 text-black/75">{renderScope(quote.scope_text)}</div>{crmConfig.quoteDefaultText?.trim()&&<p className="mt-2 whitespace-pre-wrap text-[12px] leading-[18px] text-black/65">{crmConfig.quoteDefaultText.trim()}</p>}{isMjTenant&&<p className="mt-3 text-[12px] leading-[18px] text-black/65">{mjCompletionText}</p>}</section>}

      

      {!isMj && <section className={`mt-auto ${panelClass}`}><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-black/45">Quotation total</p><p className="mt-1 text-3xl font-black">{money(quote.amount)}</p><p className="mt-1 text-[10px] text-black/45">{crmConfig.businessDetails.vatRegistered&&Number(quote.vat_rate||0)>0?`VAT ${Number(quote.vat_rate)}%`:"VAT not charged"}</p></div><div className="text-right text-sm leading-5 text-black/60">{quote.deposit_amount && <p style={{fontWeight:800,color:"#111"}}>Deposit: {money(quote.deposit_amount)}</p>}{quote.lead_time && <p style={{fontWeight:800,color:"#111"}}>Estimated lead time: {quote.lead_time}</p>}</div></div></section>}
      <footer className="mt-4 text-[10px] leading-4 text-black/45">{crmConfig.businessName}{crmConfig.businessDetails.companyNumber?` · Company No. ${crmConfig.businessDetails.companyNumber}`:""}{crmConfig.businessDetails.phone?` · ${crmConfig.businessDetails.phone}`:""}{crmConfig.businessDetails.email?` · ${crmConfig.businessDetails.email}`:""}{crmConfig.businessDetails.website?` · ${crmConfig.businessDetails.website}`:""}</footer>
    </article>

    <div className="quote-preview-scroll print:contents">
    <div className="quote-mobile-frame mx-auto">
    <article ref={printableRef} style={{height:"1122px",maxHeight:"1122px",overflow:"hidden",position:"relative",boxSizing:"border-box"} as React.CSSProperties} className={`quote-page ${pageClass} mx-auto mt-0 flex flex-col bg-white px-8 py-7 shadow-xl print:mt-0`}>
      <div data-quote-body className="quote-fit-body flex flex-col">
      <header className={`flex items-center justify-between ${isClassic?"border-b border-black pb-4":isModern?"border-b-4 border-[var(--brand)] pb-2":"border-b-2 border-[var(--brand)] pb-4"}`} style={isModern?{height:"64px",minHeight:"64px",position:"relative"}:undefined}>{tenantLogoSrc&&<img src={tenantLogoSrc} alt={crmConfig.businessName} className={logoImgClass} style={isModern?{height:"64px",width:"auto",maxWidth:"340px",display:"block"}:undefined}/>}<div className="flex flex-col justify-center text-right" style={isModern?{position:"absolute",right:0,top:"8px"}:undefined}><p className="font-black">{isModern ? j.reference : `${j.reference} / V${quote.version}`}</p><p className="text-xs text-black/45">Quotation details</p></div></header>{isModern&&<section className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] gap-5"><div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">Client Information</p><p className="mt-1 text-base font-black">{name}</p>{site&&<p className="mt-1 text-xs leading-5 text-black/65">{site}</p>}{(c.phone||c.email)&&<p className="mt-1 text-xs text-black/55">{c.phone}{c.phone&&c.email&&" · "}{c.email}</p>}</div><div className="ml-auto w-full max-w-[245px]"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--brand)]">Project</p><p className="mt-1 text-base font-black">{quoteProjectTitle(String(j.job_type||"Project"),String(quote.scope_text||""))}</p><p className="mt-1 text-xs text-black/55">Issued {new Date(quote.sent_at || quote.issued_at || (quote.status === "sent" ? (quote.updated_at || quote.created_at) : new Date().toISOString())).toLocaleDateString("en-GB",{timeZone:"Europe/London"})}{quote.valid_until?` · Valid until ${new Date(`${quote.valid_until}T12:00:00`).toLocaleDateString("en-GB")}`:""}</p></div></section>}
      {isModern && <section className={`${panelClass}`} style={{marginTop:"14px"}}><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-black/45">Quotation total</p><p className="mt-1 text-3xl font-black">{money(quote.amount)}</p><p className="mt-1 text-[10px] text-black/45">{crmConfig.businessDetails.vatRegistered&&Number(quote.vat_rate||0)>0?`VAT ${Number(quote.vat_rate)}%`:"VAT not charged"}</p></div><div className="text-right text-sm leading-5 text-black/60">{quote.deposit_amount && <p><b>Deposit:</b> {money(quote.deposit_amount)}</p>}{quote.lead_time && <p><b>Estimated lead time:</b> {quote.lead_time}</p>}</div></div></section>}
      {isModern && <section style={{marginTop:"16px"}}><h2 className="border-b border-black/15 pb-1.5 text-base font-black">Scope of Works</h2><div className="mt-2 whitespace-pre-wrap text-black/75" style={scopeTypography}>{renderScope(quote.scope_text)}</div>{crmConfig.quoteDefaultText?.trim()&&<p className="mt-2 whitespace-pre-wrap text-black/75" style={scopeTypography}>{crmConfig.quoteDefaultText.trim()}</p>}{isMjTenant&&<p className="mt-2 text-black/75" style={scopeTypography}>{mjCompletionText}</p>}</section>}
      {quote.exclusions && <section className={isModern?"":"mt-6"} style={isModern?{marginTop:"18px"}:undefined}><h2 className={isModern?"border-b border-black/15 pb-1.5 text-base font-black":"text-base font-black"}>{isModern ? "Exclusions" : "Project notes"}</h2><div className="mt-2 whitespace-pre-wrap text-sm leading-5 text-black/70">{quote.exclusions}</div></section>}
      {isModern ? <section style={{marginTop:"20px"}}><div className="rounded-xl bg-[#fafaf8] p-5 text-[14px] leading-6 text-black/80"><h2 className="mb-3 border-b border-black/15 pb-1.5 text-base font-black text-black">Payment & Terms</h2><p><b>Payment:</b> {quote.deposit_amount ? `${Number(quote.amount)>0 ? (Math.round(Number(quote.deposit_amount)/Number(quote.amount)*10000)/100).toLocaleString("en-GB",{maximumFractionDigits:2})+"% " : ""}upfront, with the balance due on completion.` : crmConfig.businessDetails.paymentTerms}</p><p className="mt-2"><b>Terms:</b> Quote valid for {crmConfig.businessDetails.quoteValidityDays} days. Final site measurements apply. Any additional or changed work will be agreed separately. Lead times are estimates and may change due to access, materials or circumstances outside our control. Fabricated items remain our property until paid in full.</p>{crmConfig.businessDetails.bankName&&<div className="mt-3 border-t border-black/10 pt-3 text-[14px] leading-6 text-black/80"><p className="font-black">Bank details</p><p>Account name: {crmConfig.businessDetails.bankName}</p><p>Sort code: {crmConfig.businessDetails.sortCode}</p><p>Account number: {crmConfig.businessDetails.accountNumber}</p></div>}</div></section> : <section className="mt-6"><h2 className="text-base font-black">Payment & key terms</h2><div className="mt-3 grid gap-x-8 gap-y-2 text-[12px] leading-5 text-black/65 sm:grid-cols-2"><p><b>Payment:</b> {quote.deposit_amount ? `${Number(quote.amount)>0 ? (Math.round(Number(quote.deposit_amount)/Number(quote.amount)*10000)/100).toLocaleString("en-GB",{maximumFractionDigits:2})+"% " : ""}deposit. ${crmConfig.businessDetails.paymentTerms.replace(/^\s*\d+(?:\.\d+)?%\s+deposit\s*,?\s*/i,"")}` : crmConfig.businessDetails.paymentTerms}</p><p><b>Validity:</b> This quotation is valid for {crmConfig.businessDetails.quoteValidityDays} days unless another validity date is shown above.</p><p><b>Scope:</b> The price covers only the works specifically described in this quotation. Additional or changed works will be agreed separately.</p><p><b>Measurements:</b> Final site measurements take precedence over preliminary dimensions.</p><p><b>Lead times:</b> Dates and lead times are estimates and may change due to access, materials or circumstances outside our control.</p><p><b>Ownership:</b> Fabricated items remain the property of the supplier until paid for in full.</p></div></section>}
{isModern&&<div className="mt-auto flex min-h-[72px] flex-col items-center justify-end pb-5 text-center text-[13px] font-semibold leading-[18px] text-black/65"><p className="m-0">{isMjTenant ? "To proceed, please confirm your acceptance of this quotation. Thank you for the opportunity to quote for your project." : "Thank you for the opportunity to quote for your project."}</p><p className="m-0">We look forward to working with you.</p></div>}{!isModern&&<section className="mt-7"><h2 className="text-base font-black">Acceptance</h2><p className="mt-2 text-sm leading-5 text-black/65">I/We accept this quotation and authorise {crmConfig.businessName} to proceed with the works described.</p><div className="mt-8 grid grid-cols-3 gap-5 text-xs"><div className="border-t border-black/35 pt-2">Name</div><div className="border-t border-black/35 pt-2">Signature</div><div className="border-t border-black/35 pt-2">Date</div></div></section>}
      </div>
      <footer className={isModern?"quote-modern-footer rounded-xl text-center text-white":"mt-auto border-t border-black/10 pt-4 text-[10px] leading-4 text-black/45"} style={isModern?{backgroundColor:quoteBrand,color:"#fff",padding:"0 12px",fontSize:"8px",lineHeight:"9px",height:"20px",minHeight:"20px",maxHeight:"20px",gap:0,flexShrink:0,boxSizing:"border-box",position:"absolute",bottom:"30px",left:"32px",right:"32px",marginTop:0,marginBottom:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}:undefined}>{isModern?<><p className="font-bold text-white" style={{whiteSpace:"nowrap",margin:0,padding:0,lineHeight:"9px",height:"9px",minHeight:0,flex:"0 0 9px"}}>{crmConfig.businessName.toUpperCase()}<span className="font-normal">{crmConfig.businessDetails.officeAddress?` · ${crmConfig.businessDetails.officeAddress}`:""}</span></p><p className="mt-0" style={{margin:0,padding:0,lineHeight:"9px",height:"9px",minHeight:0,flex:"0 0 9px"}}>{[crmConfig.businessDetails.phone,crmConfig.businessDetails.email,crmConfig.businessDetails.website,crmConfig.businessDetails.companyNumber?`Company No. ${crmConfig.businessDetails.companyNumber}`:"",crmConfig.businessDetails.vatRegistered&&crmConfig.businessDetails.vatNumber?`VAT ${crmConfig.businessDetails.vatNumber}`:""].filter(Boolean).join(" · ")}</p></>:<><p className="font-bold text-black/60">{crmConfig.businessName.toUpperCase()}</p><p>{crmConfig.businessDetails.officeAddress}</p><p>{[crmConfig.businessDetails.phone,crmConfig.businessDetails.email,crmConfig.businessDetails.website,crmConfig.businessDetails.companyNumber?`Company No. ${crmConfig.businessDetails.companyNumber}`:"",crmConfig.businessDetails.vatRegistered&&crmConfig.businessDetails.vatNumber?`VAT ${crmConfig.businessDetails.vatNumber}`:""].filter(Boolean).join(" · ")}</p>{crmConfig.businessDetails.bankName&&<p className="mt-1">Payment: {crmConfig.businessDetails.bankName} · Sort code {crmConfig.businessDetails.sortCode} · Account {crmConfig.businessDetails.accountNumber}</p>}</>}</footer>
    </article>
    </div>
    </div>
    <span className="hidden" data-pdf-status-listener onClick={() => setPdfBusy(false)} />
  </main>{dialog&&<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4 print:hidden"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" style={{borderTop:`5px solid ${quoteBrand}`}}><h2 className="text-xl font-black">{dialog.title}</h2><p className="mt-2 text-sm leading-6 text-black/65">{dialog.message}</p><div className="mt-6 flex justify-end"><button type="button" onClick={()=>setDialog(null)} className="rounded-xl px-4 py-2.5 text-sm font-black text-white" style={{backgroundColor:quoteBrand}}>OK</button></div></div></div>}{draftNotice&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 print:hidden"><div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" style={{borderTop:`5px solid ${quoteBrand}`}}><div className="flex items-center gap-4 border-b border-black/10 bg-black/[0.025] px-6 py-5">{tenantLogoSrc?<img src={tenantLogoSrc} alt={crmConfig.businessName} className="h-12 w-auto max-w-[150px] object-contain" />:<div className="flex h-11 w-11 items-center justify-center rounded-xl text-xl font-black text-white" style={{backgroundColor:quoteBrand}}>✓</div>}<div><p className="text-xs font-black uppercase tracking-[.12em]" style={{color:quoteBrand}}>{crmConfig.businessName}</p><h2 className="text-xl font-black">Email draft created</h2></div></div><div className="p-6"><p className="mt-2 text-sm leading-6 text-black/60">Draft created in <strong className="text-black">{draftNotice.email}</strong> with the quotation PDF attached.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setDraftNotice(null)} className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold">Close</button><button type="button" onClick={()=>{window.open(`https://mail.google.com/mail/u/?authuser=${encodeURIComponent(draftNotice.email)}#drafts`,"_blank","noopener,noreferrer");setDraftNotice(null);}} className="rounded-xl px-4 py-2.5 text-sm font-black text-white" style={{backgroundColor:quoteBrand}}>Open Gmail</button></div></div></div></div>}</>;
}
