"use client";
import type {CSSProperties} from "react";
import {usePathname,useSearchParams} from "next/navigation";
const demos=[["northstar","Property & Projects","#17385f"],["electrical","Electrician","#d27832"],["insurance","Insurance","#377d68"],["studio","Creative Agency","#7656a6"],["consultancy","Consultancy","#536f91"],["distribution","Distribution","#6c7f45"],["flooring","Flooring & Tiles","#9a6744"]];
export default function DemoSelector(){
 const params=useSearchParams(),pathname=usePathname(),parts=pathname.split("/").filter(Boolean),keys=demos.map(([k])=>k),selected=keys.includes(parts[0])?parts[0]:(params.get("sample")||"northstar");
 const accent=demos.find(([k])=>k===selected)?.[2]||"#17385f";
 const choose=(key:string)=>{try{sessionStorage.removeItem("bms-directory-data");sessionStorage.removeItem("bms-tenant-config")}catch{}const rest=keys.includes(parts[0])?parts.slice(1):parts[0]==="bms-runtime"?parts.slice(1):parts;window.location.assign("/"+key+(rest.length?"/"+rest.join("/"):""))};
 return <div className="bms-demo-selector print:hidden" aria-label="Choose demonstration industry">
  <span className="bms-demo-selector-label">View demo as</span>
  <div className="bms-demo-industry-scroll" role="group" aria-label="Demo industry">
   {demos.map(([key,label])=><button type="button" key={key} onClick={()=>choose(key)} aria-pressed={key===selected} className="bms-demo-industry-button" style={key===selected?{"--demo-industry-accent":accent} as CSSProperties:undefined}>{label}</button>)}
  </div>
 </div>;
}
