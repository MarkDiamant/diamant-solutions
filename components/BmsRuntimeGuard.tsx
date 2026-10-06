"use client";
import {useEffect} from "react";
const KEYS=["northstar","electrical","insurance","studio","consultancy","distribution"];
export default function BmsRuntimeGuard(){
 useEffect(()=>{
  const parts=window.location.pathname.split("/").filter(Boolean),sample=KEYS.includes(parts[0])?parts[0]:"northstar";
  const api=(path:string)=>{const u=new URL(path,window.location.origin);if(u.origin!==window.location.origin)return path;const p=u.pathname;
   if(p.startsWith("/api/admin/"))u.pathname="/api/bms-demo/"+p.slice("/api/admin/".length);
   else if(p==="/api/jobs"||p.startsWith("/api/jobs/"))u.pathname="/api/bms-demo/jobs"+p.slice("/api/jobs".length);
   else if(p.startsWith("/api/integrations/"))u.pathname="/api/bms-demo/integrations/"+p.slice("/api/integrations/".length);
   else if(p==="/api/business-software/prospects"||p.startsWith("/api/business-software/prospects/"))u.pathname="/api/bms-demo/prospects";
   else return path;
   u.searchParams.set("sample",sample);return u.pathname+u.search;
  };
  const originalFetch=window.fetch.bind(window);
  window.fetch=((input:RequestInfo|URL,init?:RequestInit)=>{
   if(typeof input==="string")return originalFetch(api(input),init);
   if(input instanceof URL)return originalFetch(new URL(api(input.toString()),window.location.origin),init);
   if(input instanceof Request){const u=new URL(input.url);if(u.origin===window.location.origin){const next=api(u.toString());if(next!==u.toString())return originalFetch(new Request(new URL(next,window.location.origin),input),init)}}
   return originalFetch(input,init);
  }) as typeof window.fetch;
  const click=(e:MouseEvent)=>{const a=(e.target as Element|null)?.closest?.("a") as HTMLAnchorElement|null;if(!a)return;const u=new URL(a.href,window.location.href);if(u.origin!==window.location.origin||u.pathname.startsWith("/api/"))return;if(!a.closest("header"))return;
   e.preventDefault();let p=u.pathname;if(p.startsWith("/bms-runtime"))p=p.slice("/bms-runtime".length)||"/";if(KEYS.includes(p.split("/").filter(Boolean)[0]||""))p="/"+p.split("/").filter(Boolean).slice(1).join("/");if(p.startsWith("/admin"))p=p.slice(6)||"/";window.location.assign("/"+sample+(p==="/"? "":p));
  };
  document.addEventListener("click",click,true);
  return()=>{window.fetch=originalFetch;document.removeEventListener("click",click,true)};
 },[]);
 return null;
}