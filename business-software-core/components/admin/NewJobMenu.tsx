"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useRef,useState,type KeyboardEvent} from "react";
export default function NewJobMenu({accent="var(--bms-accent)",className="",basePath,terminology="jobs"}:{accent?:string;className?:string;basePath?:string;terminology?:"jobs"|"orders"}){
 const [open,setOpen]=useState(false),[pending,setPending]=useState<"quick"|"full"|null>(null),router=useRouter(),root=useRef<HTMLDivElement>(null),buttonRef=useRef<HTMLButtonElement>(null),menuRef=useRef<HTMLDivElement>(null),pathname=usePathname();
 const noun=terminology==="orders"?"Order":"Job";
 const prefix=basePath??(pathname.startsWith("/bms-runtime")?"/bms-runtime":pathname.startsWith("/admin")?"/admin":"");
 useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setOpen(false)};const key=(e:globalThis.KeyboardEvent)=>{if(e.key==="Escape"){setOpen(false);buttonRef.current?.focus()}};document.addEventListener("pointerdown",close);document.addEventListener("keydown",key);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",key)}},[open]);
 useEffect(()=>{setOpen(false);setPending(null)},[pathname]);
 useEffect(()=>{const ready=()=>setPending(null);window.addEventListener("bms-dashboard-new-job-ready",ready);return()=>window.removeEventListener("bms-dashboard-new-job-ready",ready)},[]);
 useEffect(()=>{if(!open)return;const first=menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');first?.focus()},[open]);
 const onMenuKey=(e:KeyboardEvent<HTMLDivElement>)=>{const items=Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')||[]);if(!items.length)return;const current=items.indexOf(document.activeElement as HTMLElement);if(e.key==="ArrowDown"||e.key==="ArrowUp"||e.key==="Home"||e.key==="End"){e.preventDefault();const next=e.key==="Home"?0:e.key==="End"?items.length-1:e.key==="ArrowDown"?(current+1)%items.length:(current-1+items.length)%items.length;items[next].focus()}};

 return <div ref={root} className={"bms-new-job bms-dashboard-new-job "+className}>
 <button ref={buttonRef} type="button" className="bms-new-job-button" style={{backgroundColor:accent,color:"#ffffff"}} aria-haspopup="menu" aria-expanded={open} onKeyDown={e=>{if(e.key==="ArrowDown"||e.key==="Enter"||e.key===" "){e.preventDefault();setOpen(true)}}} disabled={pending!==null} onClick={()=>{if(pending)return;setOpen(v=>!v)}}>{pending?`Opening ${pending==="quick"?"Quick Add":"Full Job"}…`:`+ New ${noun}`} <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bms-new-job-chevron"><path d="m6 9 6 6 6-6"/></svg></button>
 {open&&<div ref={menuRef} role="menu" aria-label={`Create a new ${noun.toLowerCase()}`} onKeyDown={onMenuKey} className="bms-job-popover"><button role="menuitem" type="button" disabled={pending!==null} onClick={()=>{if(pending)return;setPending("quick");setOpen(false);window.dispatchEvent(new CustomEvent("bms-dashboard-new-job"));}}>Quick Add {noun}</button><button role="menuitem" type="button" disabled={pending!==null} onClick={()=>{if(pending)return;setPending("full");setOpen(false);router.push(prefix+"/jobs/new")}}>Full {noun}</button></div>}
 </div>;
}
