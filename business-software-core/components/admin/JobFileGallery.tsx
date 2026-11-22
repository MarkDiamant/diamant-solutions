"use client";
import {useEffect,useId,useRef,useState} from "react";
import {jobFilePreviewKind,jobFilePreviewUrl} from "@/lib/business-software/job-file-preview";

type JobFile = {id:string;file_name:string;mime_type?:string;signed_url?:string};
export default function JobFileGallery({files,busy,onRemove}:{files:JobFile[];busy:boolean;onRemove:(id:string)=>Promise<void>}) {
 const [preview,setPreview]=useState<JobFile|null>(null),[failed,setFailed]=useState<Record<string,boolean>>({}),[previewFailed,setPreviewFailed]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),title=useId();
 const fileKeys=files.map(f=>f.id).join(",");
 useEffect(()=>{if(preview&&!files.some(f=>f.id===preview.id))setPreview(null)},[fileKeys,preview?.id]);
 useEffect(()=>{
  const node=dialog.current;if(!preview||!node)return;
  const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
  setPreviewFailed(false);if(!node.open)node.showModal();document.body.style.overflow="hidden";
  return()=>{if(node.open)node.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus()};
 },[preview]);
 const control="inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2";
 const show=(file:JobFile)=>{setPreviewFailed(false);setPreview(file)};
 return <>
  {!files.length?<p className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">No photos or files yet.</p>:<div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Job photos and files">
   {files.map(file=>{const kind=jobFilePreviewKind(file.mime_type),url=jobFilePreviewUrl(file.signed_url);return <article key={file.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    {kind==="image"&&url?<button type="button" onClick={()=>show(file)} aria-label={"Preview "+file.file_name} className="flex h-48 w-full items-center justify-center overflow-hidden bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-3px]">
     {failed[file.id]?<span className="px-4 text-sm text-slate-600">Image preview unavailable. Open or download to retry.</span>:<img src={url} alt={file.file_name} loading="lazy" decoding="async" width={360} height={192} referrerPolicy="no-referrer" className="h-full w-full object-contain" onError={()=>setFailed(v=>({...v,[file.id]:true}))}/>}
    </button>:<div className="flex h-48 flex-col items-center justify-center gap-2 bg-slate-50 text-slate-500"><svg aria-hidden="true" width="42" height="48" viewBox="0 0 42 48" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2h17l10 10v33H8zM25 2v12h10M14 24h15M14 31h15M14 38h10"/></svg><span className="text-sm font-semibold">{kind==="pdf"?"PDF document":"File"}</span></div>}
    <div className="flex flex-1 flex-col gap-3 p-3"><p className="break-words text-sm font-bold text-slate-900" title={file.file_name}>{file.file_name}</p>
     <div className="mt-auto flex flex-wrap items-center gap-2">
      {url&&kind==="image"&&<button type="button" onClick={()=>show(file)} aria-label={"Open "+file.file_name} className={control+" border-slate-300 bg-white text-slate-800"}>Open</button>}
      {url&&kind==="pdf"&&<a href={url} target="_blank" rel="noopener noreferrer" aria-label={"Open "+file.file_name} className={control+" border-slate-300 bg-white text-slate-800"}>Open</a>}
      {url&&<a href={file.signed_url} download={file.file_name} aria-label={"Download "+file.file_name} className={control+" border-slate-300 bg-white text-slate-800"}>Download</a>}
      <button type="button" disabled={busy} onClick={()=>void onRemove(file.id)} aria-label={"Delete "+file.file_name} className={control+" border-red-200 bg-white text-red-700 disabled:opacity-50"}>Delete</button>
     </div>
    </div>
   </article>})}
  </div>}
  {preview&&<dialog ref={dialog} aria-labelledby={title} onCancel={()=>setPreview(null)} onClick={e=>{if(e.target===e.currentTarget)setPreview(null)}} className="fixed m-auto w-[calc(100%_-_24px)] max-w-6xl max-h-[calc(100dvh_-_24px)] overflow-auto rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-black/75">
   <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3"><h2 id={title} className="min-w-0 break-words text-base font-bold text-slate-900">{preview.file_name}</h2><button type="button" autoFocus onClick={()=>setPreview(null)} aria-label="Close photo preview" className={control+" shrink-0 border-slate-300 bg-white text-slate-900"}>Close</button></div>
   <div className="flex min-h-48 items-center justify-center bg-slate-100 p-3">{previewFailed?<p role="alert" className="p-6 text-sm text-slate-700">This image could not be previewed. You can still download the original file.</p>:<img src={jobFilePreviewUrl(preview.signed_url)||undefined} alt={preview.file_name} referrerPolicy="no-referrer" onError={()=>setPreviewFailed(true)} className="max-h-[70dvh] max-w-full object-contain"/>}</div>
   <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-4 py-3"><a href={preview.signed_url} download={preview.file_name} className={control+" border-slate-300 bg-white text-slate-800"}>Download original</a></div>
  </dialog>}
 </>;
}
