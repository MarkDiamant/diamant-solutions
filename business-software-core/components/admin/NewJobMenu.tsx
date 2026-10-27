"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState,type KeyboardEvent} from "react";
export default function NewJobMenu({accent="var(--bms-accent)",className="",basePath}:{accent?:string;className?:string;basePath?:string}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),buttonRef=useRef<HTMLButtonElement>(null),menuRef=useRef<HTMLDivElement>(null),pathname=usePathname();
 const prefix=basePath??(pathname.startsWith("/bms-runtime")?"/bms-runtime":pathname.startsWith("/admin")?"/admin":"/bms-runtime");
 useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpen(false);buttonRef.current?.focus()}};document.addEventListener("pointerdown",close);document.addEventListener("keydown",key);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",key)}},[open]);
 useEffect(()=>setOpen(false),[pathname]);
 useEffect(()=>{if(!open)return;const first=menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');first?.focus()},[open]);
 const onMenuKey=(e:KeyboardEvent<HTMLDivElement>)=>{const items=Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')||[]);if(!items.length)return;const current=items.indexOf(document.activeElement as HTMLElement);if(e.key==="ArrowDown"||e.key==="ArrowUp"||e.key==="Home"||e.key==="End"){e.preventDefault();const next=e.key==="Home"?0:e.key==="End"?items.length-1:e.key==="ArrowDown"?(current+1)%items.length:(current-1+items.length)%items.length;items[next].focus()}};

 return <div ref={root} className={"bms-new-job bms-dashboard-new-job "+className}>
 <button ref={buttonRef} type="button" className="bms-new-job-button" style={{backgroundColor:accent}} aria-haspopup="menu" aria-expanded={open} onKeyDown={e=>{if(e.key==="ArrowDown"||e.key==="Enter"||e.key===" "){e.preventDefault();setOpen(true)}}} onClick={()=>setOpen(v=>!v)}>+ New Job <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bms-new-job-chevron"><path d="m6 9 6 6 6-6"/></svg></button>
 {open&&<div ref={menuRef} role="menu" aria-label="Create a new job" onKeyDown={onMenuKey} className="bms-job-popover"><Link role="menuitem" href={prefix+"/jobs/new?quick=1"} onClick={()=>setOpen(false)}>Quick Add Job</Link><Link role="menuitem" href={prefix+"/jobs/new"} onClick={()=>setOpen(false)}>Full Job</Link></div>}
 </div>;
}
