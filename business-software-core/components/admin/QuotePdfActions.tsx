"use client";

import { useState } from "react";

declare global {
  interface Window { html2canvas?: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>; }
}

function bytes(text:string){return new TextEncoder().encode(text);}
function join(parts:Uint8Array[]){const n=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
async function jpegBytes(canvas:HTMLCanvasElement){const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Could not render quote")),"image/jpeg",0.96));return new Uint8Array(await blob.arrayBuffer());}
function pdfFromPages(images:{data:Uint8Array;width:number;height:number}[]){
  const parts:Uint8Array[]=[bytes("%PDF-1.4\n%M&J Quote\n")], offsets:number[]=[0]; let length=parts[0].length;
  const add=(num:number,body:Uint8Array)=>{offsets[num]=length;const h=bytes(`${num} 0 obj\n`),t=bytes("\nendobj\n");parts.push(h,body,t);length+=h.length+body.length+t.length;};
  const pageNums=images.map((_,i)=>3+i*3), imageNums=images.map((_,i)=>4+i*3), contentNums=images.map((_,i)=>5+i*3);
  add(1,bytes("<< /Type /Catalog /Pages 2 0 R >>"));
  add(2,bytes(`<< /Type /Pages /Kids [${pageNums.map(n=>`${n} 0 R`).join(" ")}] /Count ${images.length} >>`));
  images.forEach((img,i)=>{
    const page=pageNums[i],image=imageNums[i],content=contentNums[i],ratio=Math.min(595/img.width,842/img.height),w=img.width*ratio,h=img.height*ratio,stream=bytes(`q\n${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${((595-w)/2).toFixed(2)} ${((842-h)/2).toFixed(2)} cm\n/Im0 Do\nQ\n`);
    add(page,bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`));
    add(image,join([bytes(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.data.length} >>\nstream\n`),img.data,bytes("\nendstream")]));
    add(content,join([bytes(`<< /Length ${stream.length} >>\nstream\n`),stream,bytes("endstream")]));
  });
  const size=2+images.length*3,xref=length;let trailer=`xref\n0 ${size+1}\n0000000000 65535 f \n`;for(let i=1;i<=size;i++)trailer+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;trailer+=`trailer\n<< /Size ${size+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;parts.push(bytes(trailer));return join(parts);
}
async function ensureRenderer(){
  if(window.html2canvas)return;
  await new Promise<void>((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/html2canvas-pro@2.4.3/dist/html2canvas-pro.min.js";s.onload=()=>resolve();s.onerror=()=>reject(new Error("Could not load PDF renderer"));document.head.appendChild(s);});
}


// Render every quote against a fixed desktop-sized page, even when saved on a phone.
// html2canvas otherwise captures mobile breakpoints and shrinks the quote into the PDF.
async function renderQuotePage(page:HTMLElement){
  if(!window.html2canvas)throw new Error("PDF renderer is unavailable");
  await document.fonts.ready;
  await Promise.all(Array.from(page.querySelectorAll("img")).map(async img=>{
    if(!img.complete)await new Promise<void>(resolve=>{img.addEventListener("load",()=>resolve(),{once:true});img.addEventListener("error",()=>resolve(),{once:true});});
    if(img.complete&&img.naturalWidth>0&&img.decode)await img.decode().catch(()=>{});
  }));
  const logo=page.querySelector<HTMLImageElement>("header img");
  let embeddedLogo:string|null=null;
  if(logo?.src){
    // Fetch through our own origin FIRST. The configured M&J URL redirects
    // from apex to www and cannot reliably be read by Android canvas.
    const isMjLogo=/^https:\/\/(?:www\.)?mjmetal\.co\.uk\/images\/logo\.png(?:\?.*)?$/i.test(logo.src);
    const sources=isMjLogo
      ? ["/api/business-software/quote-logo?url="+encodeURIComponent("https://www.mjmetal.co.uk/images/logo.png")]
      : ["/api/business-software/quote-logo?url="+encodeURIComponent(logo.src),logo.src];
    for(const source of sources){
      try{
        const response=await fetch(source,{cache:"no-store",credentials:"same-origin"});
        if(!response.ok||!(response.headers.get("content-type")||"").startsWith("image/"))continue;
        const blob=await response.blob();
        embeddedLogo=await new Promise<string>((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(String(reader.result));
          reader.onerror=()=>reject(new Error("Logo encoding failed"));
          reader.readAsDataURL(blob);
        });
        if(embeddedLogo)break;
      }catch{/* Try next approved source. */}
    }
    if(isMjLogo&&!embeddedLogo)throw new Error("M&J logo could not be loaded. PDF not saved without the logo.");
  }
  // html2canvas clones the page asynchronously. Setting the logo only inside
  // onclone races image loading, so it can capture a blank logo on mobile.
  // Load the embedded image on the live page before starting the capture.
  const originalLogoSrc=logo?.getAttribute("src")??null;
  let replacedLogo=false;
  if(logo&&embeddedLogo){
    const preload=new Image();
    preload.src=embeddedLogo;
    await new Promise<void>(resolve=>{
      if(preload.complete){resolve();return;}
      preload.onload=()=>resolve();
      preload.onerror=()=>resolve();
    });
    if(preload.naturalWidth>0){
      logo.src=embeddedLogo;
      replacedLogo=true;
    }
  }
  const previous={width:page.style.width,minWidth:page.style.minWidth,maxWidth:page.style.maxWidth,zoom:page.style.zoom};
  page.style.width="900px";page.style.minWidth="900px";page.style.maxWidth="900px";page.style.zoom="1";
  try{const result=await window.html2canvas(page,{
    scale:2,useCORS:true,backgroundColor:"#ffffff",logging:false,foreignObjectRendering:false,
    windowWidth:1200,
    onclone:(doc:Document)=>{
      const cloned=doc.querySelector<HTMLElement>(".quote-page:not(.hidden)");
      if(cloned&&embeddedLogo){const image=cloned.querySelector<HTMLImageElement>("header img");if(image){image.src=embeddedLogo;image.removeAttribute("crossorigin");}}
      if(cloned){cloned.style.width="900px";cloned.style.minWidth="900px";cloned.style.maxWidth="900px";cloned.style.marginLeft="0";cloned.style.marginRight="0";cloned.style.zoom="1";}
      const viewport=doc.querySelector<HTMLMetaElement>('meta[name="viewport"]');
      if(viewport)viewport.setAttribute("content","width=1200, initial-scale=1");
    }
  });
    // The Android renderer may omit the logo from its snapshot. Composite it
    // after capture without changing the PDF download path or page layout.
    // If drawing is unsupported, preserve the working PDF download.
    try{
      if(logo&&embeddedLogo){
        const image=new Image();
        image.src=embeddedLogo;
        if(!image.complete)await new Promise<void>(resolve=>{image.onload=()=>resolve();image.onerror=()=>resolve();});
        if(image.naturalWidth>0){
          const box=page.getBoundingClientRect(),rect=logo.getBoundingClientRect();
          const x=(rect.left-box.left)*result.width/box.width;
          const y=(rect.top-box.top)*result.height/box.height;
          const w=rect.width*result.width/box.width;
          const h=rect.height*result.height/box.height;
          const context=result.getContext("2d");
          if(!context)throw new Error("PDF image canvas unavailable");
          context.drawImage(image,x,y,w,h);
        }else if(logo?.src.includes("mjmetal.co.uk"))throw new Error("M&J logo image failed to decode");
      }
    }catch(error){if(logo?.src.includes("mjmetal.co.uk"))throw new Error("M&J logo could not be drawn into PDF: "+String(error));}
    return result;
  }finally{page.style.width=previous.width;page.style.minWidth=previous.minWidth;page.style.maxWidth=previous.maxWidth;page.style.zoom=previous.zoom;if(replacedLogo&&logo&&originalLogoSrc!==null)logo.setAttribute("src",originalLogoSrc);}
}

export async function downloadQuotePdf(reference:string){await ensureRenderer();const pages=Array.from(document.querySelectorAll<HTMLElement>(".quote-page")).filter(el=>getComputedStyle(el).display!=="none"&&!el.classList.contains("hidden"));if(!pages.length||!window.html2canvas)throw new Error("Quote preview is not ready");await document.fonts.ready;const images=[] as {data:Uint8Array;width:number;height:number}[];for(const page of pages){const canvas=await renderQuotePage(page);images.push({data:await jpegBytes(canvas),width:canvas.width,height:canvas.height});}const blob=new Blob([pdfFromPages(images)],{type:"application/pdf"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${reference}-Quote.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}

export default function QuotePdfActions({ reference, quoteId }: { reference: string; quoteId: string }) {
  const [busy,setBusy]=useState(false);
  async function generate(){
    setBusy(true);
    try{
      await ensureRenderer();
      const pages=Array.from(document.querySelectorAll<HTMLElement>(".quote-page")).filter(el=>getComputedStyle(el).display!=="none");
      if(!pages.length||!window.html2canvas)throw new Error("Quote preview is not ready");
      const images=[] as {data:Uint8Array;width:number;height:number}[];
      for(const page of pages){const canvas=await renderQuotePage(page);images.push({data:await jpegBytes(canvas),width:canvas.width,height:canvas.height});}
      const pdf=pdfFromPages(images),blob=new Blob([pdf],{type:"application/pdf"});

      const response=await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}/quotes/${encodeURIComponent(quoteId)}/pdf`,{method:"POST",headers:{"Content-Type":"application/pdf"},body:blob});
      const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||"Could not save PDF");
      const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${reference}-Quote.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);

    }catch(e){alert(e instanceof Error?e.message:"Could not create PDF");}
    finally{setBusy(false);document.querySelector<HTMLElement>("[data-pdf-status-listener]")?.click();}
  }
  return <button id="save-quote-pdf" onClick={()=>void generate()} disabled={busy} className="hidden">{busy?"Saving...":"Save PDF"}</button>;
}
