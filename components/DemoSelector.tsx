"use client";
import {usePathname,useSearchParams} from "next/navigation";
const demos=[["northstar","Property & Projects"],["electrical","Electrician"],["insurance","Insurance"],["studio","Creative Agency"],["consultancy","Consultancy"],["distribution","Distribution"]];
export default function DemoSelector(){
 const params=useSearchParams(),pathname=usePathname(),selected=params.get("sample")||"northstar";
 const choose=(key:string)=>{try{sessionStorage.removeItem("bms-directory-data");sessionStorage.removeItem("bms-tenant-config")}catch{}const q=new URLSearchParams(params.toString());q.set("sample",key);window.location.assign(pathname+"?"+q.toString())};
 return <div className="border-b border-black/10 bg-white px-3 py-2 text-center text-xs font-bold print:hidden">
  <div className="sm:hidden"><div className="mb-1.5 text-[11px] font-black text-black/65">Switch business demo</div><details className="relative mx-auto inline-block text-left"><summary className="cursor-pointer list-none rounded-lg border border-black/20 bg-[#17385f] px-4 py-2 font-black !text-white">{demos.find(([k])=>k===selected)?.[1]||"Choose business demo"} ▾</summary><div className="absolute left-1/2 z-[80] mt-2 w-56 -translate-x-1/2 rounded-xl border border-black/10 bg-white p-2 shadow-xl">{demos.map(([key,label])=><button type="button" key={key} onClick={()=>choose(key)} className={`block w-full rounded-lg px-3 py-2 text-left ${key===selected?"bg-[#17385f] !text-white":"text-black hover:bg-black/5"}`}>{label}</button>)}</div></details></div>
  <div className="hidden items-center justify-center gap-2 sm:flex"><span>View demo as:</span>{demos.map(([key,label])=><button type="button" key={key} onClick={()=>choose(key)} className={`rounded-full border border-black/15 px-3 py-1.5 ${key===selected?"bg-[#17385f] !text-white":"bg-[#f7f7f4] text-black hover:bg-[#17385f] hover:!text-white active:bg-[#17385f] active:!text-white focus:bg-[#17385f] focus:!text-white"}`}>{label}</button>)}</div>
 </div>;
}