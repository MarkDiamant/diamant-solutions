"use client";
import {useState} from "react";
import {friendlyError} from "../../lib/friendly-error";
declare global {
  interface Window { html2canvas?: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>; }
}

function bytes(text:string){return new TextEncoder().encode(text);}
function join(parts:Uint8Array[]){const n=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
async function jpegBytes(canvas:HTMLCanvasElement){const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Could not render quote")),"image/jpeg",0.96));return new Uint8Array(await blob.arrayBuffer());}
function pdfFromPages(images:{data:Uint8Array;width:number;height:number}[]){
  const parts:Uint8Array[]=[bytes("%PDF-1.4\n%BMS Quote\n")], offsets:number[]=[0]; let length=parts[0].length;
  const add=(num:number,body:Uint8Array)=>{offsets[num]=length;const h=bytes(`${num} 0 obj\n`),t=bytes("\nendobj\n");parts.push(h,body,t);length+=h.length+body.length+t.length;};
  const pageNums=images.map((_,i)=>3+i*3), imageNums=images.map((_,i)=>4+i*3), contentNums=images.map((_,i)=>5+i*3);
  add(1,bytes("<< /Type /Catalog /Pages 2 0 R >>"));
  add(2,bytes(`<< /Type /Pages /Kids [${pageNums.map(n=>`${n} 0 R`).join(" ")}] /Count ${images.length} >>`));
  images.forEach((img,i)=>{
    const page=pageNums[i],image=imageNums[i],content=contentNums[i],stream=bytes(`q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n`);
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


export default function InvoicePdfActions({reference,invoiceId,onPdf}:{reference:string;invoiceId:string;onPdf?:(base64:string,filename:string)=>Promise<void>}){
 const [busy,setBusy]=useState(false);
 async function generate(){
  setBusy(true);
  try{
   await ensureRenderer();
   const page=document.querySelector<HTMLElement>(".bms-invoice-page");
   if(!page||!window.html2canvas)throw new Error("Invoice preview is not ready");
   await Promise.all(Array.from(page.querySelectorAll("img")).map(img=>img.complete?Promise.resolve():new Promise<void>(resolve=>{img.addEventListener("load",()=>resolve(),{once:true});img.addEventListener("error",()=>resolve(),{once:true});setTimeout(resolve,2500);})));
   const canvas=await window.html2canvas(page,{scale:2,useCORS:true,backgroundColor:"#ffffff",logging:false,width:page.offsetWidth,height:page.offsetHeight,windowWidth:1200});
   const pdf=pdfFromPages([{data:await jpegBytes(canvas),width:canvas.width,height:canvas.height}]);
   const blob=new Blob([pdf],{type:"application/pdf"}),filename=(reference||invoiceId)+"-Invoice.pdf";
   if(onPdf){const base64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||"").split(",")[1]||"");r.onerror=()=>reject(new Error("Could not prepare PDF"));r.readAsDataURL(blob);});await onPdf(base64,filename);}
   else{const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  }catch(e){window.dispatchEvent(new CustomEvent("bms-invoice-error",{detail:friendlyError(e)||"Could not generate invoice PDF"}));}
  finally{setBusy(false);}
 }
 return <button type="button" disabled={busy} onClick={()=>void generate()} className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{backgroundColor:"var(--brand)"}}>{busy?"Preparing PDF...":onPdf?"Prepare and email invoice":"Download branded invoice PDF"}</button>;
}
