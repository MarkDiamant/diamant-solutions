"use client";
import {useState} from "react";
import {friendlyError} from "../../lib/friendly-error";
declare global {
  interface Window { html2canvas?: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>; }
}

function bytes(text:string){return new TextEncoder().encode(text);}
function join(parts:Uint8Array[]){const n=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
async function jpegBytes(canvas:HTMLCanvasElement){const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Could not render quote")),"image/jpeg",0.96));return new Uint8Array(await blob.arrayBuffer());}
function pdfFromPages(images:{data:Uint8Array;width:number;height:number}[],label:string){
  const parts:Uint8Array[]=[bytes("%PDF-1.4\n%BMS Quote\n")], offsets:number[]=[0]; let length=parts[0].length;
  const add=(num:number,body:Uint8Array)=>{offsets[num]=length;const h=bytes(`${num} 0 obj\n`),t=bytes("\nendobj\n");parts.push(h,body,t);length+=h.length+body.length+t.length;};
  const fontNum=3+images.length*3,safeLabel=label.replace(/[^A-Za-z0-9 _-]/g,'').slice(0,70);
  const pageNums=images.map((_,i)=>3+i*3), imageNums=images.map((_,i)=>4+i*3), contentNums=images.map((_,i)=>5+i*3);
  add(1,bytes("<< /Type /Catalog /Pages 2 0 R >>"));
  add(2,bytes(`<< /Type /Pages /Kids [${pageNums.map(n=>`${n} 0 R`).join(" ")}] /Count ${images.length} >>`));
  images.forEach((img,i)=>{
    const page=pageNums[i],image=imageNums[i],content=contentNums[i];
    const scale=Math.min(559/img.width,806/img.height),drawW=img.width*scale,drawH=img.height*scale;
    const offsetX=(595-drawW)/2,offsetY=824-drawH;
    const stream=bytes(`q\n${drawW.toFixed(3)} 0 0 ${drawH.toFixed(3)} ${offsetX.toFixed(3)} ${offsetY.toFixed(3)} cm\n/Im0 Do\nQ\nBT /F1 8 Tf 18 831 Td (Invoice ${safeLabel}) Tj ET\nBT /F1 8 Tf 18 7 Td (Page ${i+1} of ${images.length}) Tj ET\n`);
    add(page,bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontNum} 0 R >> /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`));
    add(image,join([bytes(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.data.length} >>\nstream\n`),img.data,bytes("\nendstream")]));
    add(content,join([bytes(`<< /Length ${stream.length} >>\nstream\n`),stream,bytes("endstream")]));
  });
  add(fontNum,bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'));
  const size=fontNum,xref=length;let trailer=`xref\n0 ${size+1}\n0000000000 65535 f \n`;for(let i=1;i<=size;i++)trailer+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;trailer+=`trailer\n<< /Size ${size+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;parts.push(bytes(trailer));return join(parts);
}
let rendererPromise:Promise<void>|null=null;
async function ensureRenderer(){
 if(window.html2canvas)return;
 if(!rendererPromise)rendererPromise=new Promise<void>((resolve,reject)=>{const s=document.createElement('script'),timer=window.setTimeout(()=>{s.remove();reject(new Error('PDF renderer timed out. Try again.'));},15000);s.src='/vendor/html2canvas-pro-2.4.3.min.js';s.onload=()=>{clearTimeout(timer);window.html2canvas?resolve():reject(new Error('PDF renderer unavailable'));};s.onerror=()=>{clearTimeout(timer);s.remove();reject(new Error('Could not load PDF renderer. Try again.'));};document.head.appendChild(s);}).catch(e=>{rendererPromise=null;throw e});
 await rendererPromise;
}
function splitPages(canvas:HTMLCanvasElement,breaks:number[]){const output:HTMLCanvasElement[]=[],ctx=canvas.getContext('2d');if(!ctx)throw new Error('PDF canvas unavailable');const max=Math.floor(canvas.width*806/559);for(let start=0;start<canvas.height;){let end=Math.min(start+max,canvas.height);if(end<canvas.height){const preferred=breaks.filter(y=>y>start+max*0.35&&y<=end).pop();if(preferred)end=preferred;else{const min=start+Math.floor(max*0.78);for(let y=end;y>=min;y-=2){const row=ctx.getImageData(0,y,canvas.width,1).data;let ink=0;for(let x=0;x<canvas.width;x+=4){const n=x*4;if(Math.min(row[n],row[n+1],row[n+2])<220)ink++;}if(ink/(canvas.width/4)<0.02){end=y;break;}}}}const page=document.createElement('canvas');page.width=canvas.width;page.height=end-start;page.getContext('2d')!.drawImage(canvas,0,start,canvas.width,end-start,0,0,canvas.width,end-start);output.push(page);start=end;}return output;}


export default function InvoicePdfActions({reference,invoiceId,invoiceNumber,actionLabel,onPdf}:{reference:string;invoiceId:string;invoiceNumber?:string;actionLabel?:string;onPdf?:(base64:string,filename:string)=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function generate(){
  setBusy(true);setError('');
  try{
   await ensureRenderer();
   const page=document.querySelector<HTMLElement>(".bms-invoice-page");
   if(!page||!window.html2canvas)throw new Error("Invoice preview is not ready");
   await Promise.all(Array.from(page.querySelectorAll("img")).map(img=>img.complete?Promise.resolve():new Promise<void>(resolve=>{img.addEventListener("load",()=>resolve(),{once:true});img.addEventListener("error",()=>resolve(),{once:true});setTimeout(resolve,2500);})));
   const clone=page.cloneNode(true) as HTMLElement;Object.assign(clone.style,{position:'absolute',left:'-10000px',top:'0',width:'900px',maxWidth:'900px',minHeight:'1120px',margin:'0',boxSizing:'border-box'});clone.style.setProperty('--brand',getComputedStyle(page).getPropertyValue('--brand'));clone.style.fontFamily=getComputedStyle(page).fontFamily;document.body.appendChild(clone);
   const origin=clone.getBoundingClientRect().top,breaks=Array.from(clone.querySelectorAll(':scope > section,:scope > footer')).map(e=>Math.floor((e.getBoundingClientRect().top-origin)*2)).sort((a,b)=>a-b);let canvas:HTMLCanvasElement;try{canvas=await window.html2canvas(clone,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,width:900,height:clone.scrollHeight,windowWidth:1200});}finally{clone.remove();}
   const images=[];for(const part of splitPages(canvas,breaks))images.push({data:await jpegBytes(part),width:part.width,height:part.height});
   const pdf=pdfFromPages(images,invoiceNumber||reference||invoiceId);
   const blob=new Blob([pdf],{type:"application/pdf"}),filename=(reference||invoiceId)+"-Invoice.pdf";
   if(onPdf){const base64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||"").split(",")[1]||"");r.onerror=()=>reject(new Error("Could not prepare PDF"));r.readAsDataURL(blob);});await onPdf(base64,filename);}
   else{const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  }catch(e){setError(friendlyError(e)||'Could not generate invoice PDF');window.dispatchEvent(new CustomEvent("bms-invoice-error",{detail:friendlyError(e)||"Could not generate invoice PDF"}));}
  finally{setBusy(false);}
 }
 return <span className="inline-flex max-w-full flex-col gap-1"><button type="button" disabled={busy} onClick={()=>void generate()} className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{backgroundColor:"var(--brand)"}}>{busy?"Preparing PDF...":onPdf?(actionLabel||"Prepare invoice PDF"):"Download branded invoice PDF"}</button>{error&&<span role="alert" className="text-sm font-semibold text-red-800">{error}</span>}</span>;
}
