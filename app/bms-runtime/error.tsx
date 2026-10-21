"use client";
import {useEffect,useState} from "react";
import {DEFAULT_CRM_CONFIG} from "@/lib/crm/config";
export default function BmsError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 const [accent,setAccent]=useState(DEFAULT_CRM_CONFIG.accentColour||"#e66a24");
 useEffect(()=>{console.error("BMS page error",error);fetch("/api/admin/settings",{cache:"no-store"}).then(async response=>{if(response.ok){const body=await response.json();if(/^#[0-9a-fA-F]{6}$/.test(String(body?.settings?.accentColour||"")))setAccent(body.settings.accentColour);}}).catch(()=>{});},[error]);
 const temporary=/removeChild|not a child of this node|hydration|chunk|loading|network|fetch/i.test(error?.message||"");
 const actionStyle={backgroundColor:accent,borderColor:accent,color:"#fff"};
 const outlineStyle={borderColor:accent,color:accent};
 return <main className="flex min-h-[60vh] flex-1 items-start justify-center bg-[#f5f5f2] p-6"><div className="mt-12 w-full max-w-xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm"><h1 className="text-xl font-black">This page could not open</h1><p className="mt-2 text-sm text-black/70">{temporary?"There was a temporary problem displaying this page. Please refresh and try again.":"Something went wrong while opening this page. Please try again. If it continues, contact support."}</p><p className="mt-2 text-sm text-black/60">If you were saving changes, check the record before trying again.</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={()=>window.location.reload()} style={actionStyle} className="cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-black">Refresh page</button><button type="button" onClick={reset} style={outlineStyle} className="cursor-pointer rounded-xl border bg-white px-4 py-2.5 text-sm font-bold">Try again</button><a href="/admin" style={outlineStyle} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold">Back to dashboard</a></div></div></main>;
}
