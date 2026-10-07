"use client";

import { useState } from "react";

declare global {
  interface Window { html2canvas?: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>; }
}

function bytes(text:string){return new TextEncoder().encode(text);}
function join(parts:Uint8Array[]){const n=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
async function jpegBytes(canvas:HTMLCanvasElement){const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Could not render quote")),"image/jpeg",0.96));return new Uint8Array(await blob.arrayBuffer());}
function pdfFromPages(images:{data:Uint8Array;width:number;height:number}[]){
  const parts:Uint8Array[]=[bytes("%PDF-1.4
%BMS Quote
")], offsets:number[]=[0]; let length=parts[0].length;
  const add=(num:number,body:Uint8Array)=>{offsets[num]=length;const h=bytes(`${num} 0 obj
`),t=bytes("
endobj
");parts.push(h,body,t);length+=h.length+body.length+t.length;};
  const pageNums=images.map((_,i)=>3+i*3), imageNums=images.map((_,i)=>4+i*3), contentNums=images.map((_,i)=>5+i*3);
  add(1,bytes("<< /Type /Catalog /Pages 2 0 R >>"));
  add(2,bytes(`<< /Type /Pages /Kids [${pageNums.map(n=>`${n} 0 R`).join(" ")}] /Count ${images.length} >>`));
  images.forEach((img,i)=>{
    const page=pageNums[i],image=imageNums[i],content=contentNums[i],stream=bytes(`q
595 0 0 842 0 0 cm
/Im0 Do
Q
`);
    add(page,bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`));
    add(image,join([bytes(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.data.length} >>
stream
`),img.data,bytes("
endstream")]));
    add(content,join([bytes(`<< /Length ${stream.length} >>
stream
`),stream,bytes("endstream")]));
  });
  const size=2+images.length*3,xref=length;let trailer=`xref
0 ${size+1}
0000000000 65535 f 
`;for(let i=1;i<=size;i++)trailer+=`${String(offsets[i]).padStart(10,"0")} 00000 n 
`;trailer+=`trailer
<< /Size ${size+1} /Root 1 0 R >>
startxref
${xref}
%%EOF
`;parts.push(bytes(trailer));return join(parts);
}
async function ensureRenderer(){
  if(window.html2canvas)return;
  await new Promise<void>((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/html2canvas-pro@2.4.3/dist/html2canvas-pro.min.js";s.onload=()=>resolve();s.onerror=()=>reject(new Error("Could not load PDF renderer"));document.head.appendChild(s);});
}

export default function QuotePdfActions({ reference, quoteId }: { reference: string; quoteId: string }) {
  const [busy,setBusy]=useState(false);
  async function generate(){
    setBusy(true);
    try{
      await ensureRenderer();
      const pages=Array.from(document.querySelectorAll<HTMLElement>(".quote-page")).filter(el=>getComputedStyle(el).display!=="none");
      if(!pages.length||!window.html2canvas)throw new Error("Quote preview is not ready");
      const images=[] as {data:Uint8Array;width:number;height:number}[];
      for(const page of pages){
        const imgs=Array.from(page.querySelectorAll<HTMLImageElement>("img"));
        await Promise.all(imgs.map(img=>img.complete&&img.naturalWidth>0?Promise.resolve():new Promise<void>(resolve=>{const done=()=>resolve();img.addEventListener("load",done,{once:true});img.addEventListener("error",done,{once:true});setTimeout(done,3000);})));
        await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
        // Render from the canonical desktop quote geometry even when Save PDF is pressed on mobile.
        // The on-screen mobile preview is only a scaled view of this same 900px layout.
        const frame=page.closest<HTMLElement>(".quote-mobile-frame");
        const previousTransform=frame?.style.transform||"";
        if(frame)frame.style.transform="none";
        const canvas=await window.html2canvas(page,{scale:2,useCORS:true,allowTaint:true,backgroundColor:"#ffffff",logging:false,width:900,windowWidth:1200});
        if(frame)frame.style.transform=previousTransform;
        images.push({data:await jpegBytes(canvas),width:canvas.width,height:canvas.height});
      }
      const pdf=pdfFromPages(images),blob=new Blob([pdf],{type:"application/pdf"});
      const file=new File([pdf],`${reference}-Quote.pdf`,{type:"application/pdf"});
      if(document.documentElement.dataset.quoteEmailPdf==="1"){delete document.documentElement.dataset.quoteEmailPdf;const base64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||"").split(",")[1]||"");r.onerror=()=>reject(new Error("Could not prepare PDF"));r.readAsDataURL(blob);});window.dispatchEvent(new CustomEvent("quote-email-pdf",{detail:{pdfBase64:base64,pdfName:`${reference}-Quote.pdf`}}));return;}
      if(document.documentElement.dataset.quoteShare==="whatsapp"&&navigator.share&&navigator.canShare?.({files:[file]})){delete document.documentElement.dataset.quoteShare;await navigator.share({files:[file]});}
      else{delete document.documentElement.dataset.quoteShare;const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${reference}-Quote.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}

    }catch(e){alert(e instanceof Error?e.message:"Could not create PDF");}
    finally{setBusy(false);document.querySelector<HTMLElement>("[data-pdf-status-listener]")?.click();}
  }
  return <button id="save-quote-pdf" onClick={()=>void generate()} disabled={busy} className="hidden">{busy?"Saving...":"Save PDF"}</button>;
}
