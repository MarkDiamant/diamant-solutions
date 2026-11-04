"use client";
import {useEffect,useState} from "react";

export default function FileThumbnail({url,name}:{url:string;name:string}){
 const [attempt,setAttempt]=useState(0);
 const [status,setStatus]=useState<"loading"|"loaded"|"error">("loading");
 const thumbnail=url+(url.includes("?")?"&":"?")+"thumbnail=1";
 useEffect(()=>{setStatus("loading");},[thumbnail,attempt]);
 return <div className="relative mt-2 flex min-h-36 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
  {status==="loading"&&<div role="status" aria-live="polite" className="absolute inset-0 flex animate-pulse items-center justify-center text-xs font-semibold text-slate-600">Loading image...</div>}
  {status==="error"&&<div role="alert" className="flex flex-col items-center gap-2 p-3 text-center text-xs text-red-700"><span>Image preview could not be loaded.</span><button type="button" onClick={()=>{setStatus("loading");setAttempt(n=>n+1);}} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-semibold">Retry preview</button></div>}
  <img key={thumbnail+"-"+attempt} src={thumbnail} alt={name} loading="lazy" decoding="async" fetchPriority="low" onLoad={()=>setStatus("loaded")} onError={()=>setStatus("error")} className={status==="loaded"?"max-h-48 w-full object-contain":"max-h-48 w-full object-contain opacity-0"} />
 </div>;
}
