"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState} from "react";
export default function NewJobMenu({accent="#e66a24",className=""}:{accent?:string;className?:string}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),pathname=usePathname();
 const prefix=pathname.startsWith("/bms-runtime")?"/bms-runtime":pathname.startsWith("/admin")?"/admin":"/bms-runtime";
 useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false)};document.addEventListener("pointerdown",close);document.addEventListener("keydown",key);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",key)}},[open]);
 useEffect(()=>setOpen(false),[pathname]);
 return <div ref={root} className={"bms-new-job bms-dashboard-new-job "+className}>
 <button type="button" className="bms-new-job-button" style={{backgroundColor:accent}} aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>+ New Job <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bms-new-job-chevron"><path d="m6 9 6 6 6-6"/></svg></button>
 {open&&<div role="menu" className="bms-job-popover"><Link role="menuitem" href={prefix+"/jobs/new?quick=1"} onClick={()=>setOpen(false)}>Quick Add Job</Link><Link role="menuitem" href={prefix+"/jobs/new"} onClick={()=>setOpen(false)}>Full Job</Link></div>}
 </div>;
}
