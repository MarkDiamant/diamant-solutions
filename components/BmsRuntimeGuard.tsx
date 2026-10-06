"use client";
import {useLayoutEffect} from "react";

const currentSample=()=>new URLSearchParams(window.location.search).get("sample")||"northstar";
const withSample=(value:string)=>{const u=new URL(value,window.location.origin),sample=currentSample();if(!u.searchParams.has("sample"))u.searchParams.set("sample",sample);return u.pathname+u.search;};
const withSamplePage=(value:string)=>{const u=new URL(value,window.location.href);if(u.origin!==window.location.origin)return value;const sample=currentSample();if(!u.searchParams.has("sample"))u.searchParams.set("sample",sample);return u.pathname+u.search+u.hash;};
const rewrite=(value:string)=>{
  if(value==="/api/jobs"||value.startsWith("/api/jobs/")) return withSample("/api/bms-demo/jobs"+value.slice("/api/jobs".length));
  if(value.startsWith("/api/admin")) return withSample("/api/bms-demo"+value.slice("/api/admin".length));
  if(value.startsWith("/api/integrations")) return withSample("/api/bms-demo/integrations"+value.slice("/api/integrations".length));
  if(value.startsWith("/api/business-software/prospects")) return withSample("/api/bms-demo/prospects"+value.slice("/api/business-software/prospects".length));
  return value;
};

export default function BmsRuntimeGuard(){
  useLayoutEffect(()=>{

    const originalFetch=window.fetch.bind(window);
    window.fetch=((input:RequestInfo|URL,init?:RequestInit)=>{
      if(typeof input==="string") return originalFetch(rewrite(input),init);
      if(input instanceof URL && input.origin===window.location.origin){
        const rewritten=rewrite(input.pathname+input.search); return originalFetch(new URL(rewritten,window.location.origin),init);
      }
      if(input instanceof Request){
        const url=new URL(input.url);
        if(url.origin===window.location.origin && (url.pathname.startsWith("/api/admin")||url.pathname.startsWith("/api/integrations")||url.pathname.startsWith("/api/jobs")||url.pathname.startsWith("/api/business-software/prospects"))){
          const rewritten=new URL(rewrite(url.pathname+url.search),window.location.origin);
          return originalFetch(new Request(rewritten,input),init);
        }
      }
      return originalFetch(input,init);
    }) as typeof window.fetch;

    const originalPush=history.pushState.bind(history);
    const originalReplace=history.replaceState.bind(history);
    const demoUrl=(value:string|URL|null|undefined)=>{
      if(value==null)return value as any;
      const url=new URL(String(value),window.location.href);
      if(url.origin===window.location.origin&&(url.pathname==="/admin"||url.pathname.startsWith("/admin/"))){
        const sample=currentSample();
        url.pathname=url.pathname.slice("/admin".length)||"/";
        if(sample&&!url.searchParams.has("sample"))url.searchParams.set("sample",sample);
        return url.pathname+url.search+url.hash;
      }
      if(url.origin===window.location.origin&&url.pathname.startsWith("/bms-runtime"))return withSamplePage(url.toString()) as any;
      return value as any;
    };
    history.pushState=((data:any,unused:string,url?:string|URL|null)=>originalPush(data,unused,demoUrl(url))) as typeof history.pushState;
    history.replaceState=((data:any,unused:string,url?:string|URL|null)=>originalReplace(data,unused,demoUrl(url))) as typeof history.replaceState;

    const click=(event:MouseEvent)=>{
      const target=event.target as Element|null;
      const anchor=target?.closest?.("a") as HTMLAnchorElement|null;
      if(!anchor) return;
      const url=new URL(anchor.href,window.location.href);
      if(url.origin!==window.location.origin) return;
      if(anchor.closest("header")&&!url.pathname.startsWith("/api/")){event.preventDefault();const sample=currentSample(),rawPath=url.pathname.startsWith("/bms-runtime")?url.pathname.slice("/bms-runtime".length)||"/":url.pathname,path="/bms-runtime"+(rawPath==="/"?"/":rawPath),q=new URLSearchParams(url.search);q.set("sample",sample);window.location.assign(path+"?"+q.toString()+url.hash);return}
      if(url.pathname==="/admin"||url.pathname.startsWith("/admin/")){
        event.preventDefault();
        const sample=currentSample();
        url.pathname=url.pathname.slice("/admin".length)||"/";
        if(sample&&!url.searchParams.has("sample"))url.searchParams.set("sample",sample);
        window.location.assign(url.pathname+url.search+url.hash);
        return;
      }
      if(url.pathname.startsWith("/bms-runtime")){
        const target=withSamplePage(url.toString());
        if(target!==url.pathname+url.search+url.hash){event.preventDefault();window.location.assign(target);return}
      }
      if(url.pathname.startsWith("/api/integrations")){
        event.preventDefault();
        window.location.assign("/api/bms-demo/integrations"+url.pathname.slice("/api/integrations".length)+url.search+url.hash);
      }
    };
    document.addEventListener("click",click,true);
    return ()=>{window.fetch=originalFetch;history.pushState=originalPush as typeof history.pushState;history.replaceState=originalReplace as typeof history.replaceState;document.removeEventListener("click",click,true);};
  },[]);
  return null;
}
