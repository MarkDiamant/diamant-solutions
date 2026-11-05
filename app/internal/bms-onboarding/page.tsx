"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase-browser";
export default function InternalOnboarding(){
 const [items,setItems]=useState<any[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(""),[token,setToken]=useState("");
 async function load(t:string){
  const r=await fetch("/api/internal/bms-onboarding",{headers:{Authorization:"Bearer "+t},cache:"no-store"});
  const data=await r.json().catch(()=>({}));if(!r.ok){setError(data.error||"Unable to load queue");return;}
  setItems(data.items||[]);setError("");
 }
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{const t=data.session?.access_token||"";setToken(t);if(t)load(t);else setError("Sign in with your authorised Diamant Solutions administrator account.")})},[]);
 async function prepare(item:any){
  setBusy(item.tenant_id);
  try{
   const r=await fetch("/api/internal/bms-onboarding",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({tenantId:item.tenant_id,action:"prepare"})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||"Could not prepare paid tenant");
   await load(token);
  }catch(e:any){setError(e.message||"Preparation failed")}finally{setBusy("")}
 }
 async function update(item:any,status:string,notes:string,bmsTenantId?:string){
  setBusy(item.tenant_id);try{
   const r=await fetch("/api/internal/bms-onboarding",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({tenantId:item.tenant_id,status,notes,bmsTenantId})});
   const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"Could not save review");await load(token);
  }catch(e){setError(e.message)}finally{setBusy("")}
 }
 return <main style={{maxWidth:1100,margin:"auto",padding:24,fontFamily:"Arial,sans-serif"}}>
  <h1>Client onboarding reviews</h1><p>Internal configuration checklist. Customer systems remain unapproved until verified setup is complete.</p>
  {error&&<p role="alert" style={{color:"#a11"}}>{error}</p>}
  <p>{items.length} onboarding applications</p>
  {items.map(item=><section key={item.tenant_id} style={{border:"1px solid #ddd",borderRadius:12,padding:20,margin:"18px 0"}}>
   <h2>{item.answers?.businessName||item.tenants?.name||"Unnamed business"}</h2>
   <p><strong>Status:</strong> {item.status} · <strong>Progress:</strong> {item.progress||0}% · <strong>Submitted:</strong> {item.submitted_at?new Date(item.submitted_at).toLocaleDateString("en-GB"):"Not submitted"}</p>
   <p><strong>Requested modules:</strong> {(item.proposed_config?.modules?.enabled||item.answers?.optionalModules||[]).join(", ")||"Not selected"}</p>
   <details><summary>Answers and proposed setup</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:12}}>{JSON.stringify({answers:item.answers,proposedConfiguration:item.proposed_config},null,2)}</pre></details>
   {["submitted","being_configured"].includes(item.status)&&!item.review?.applied_bms_tenant_id&&<button disabled={busy===item.tenant_id} onClick={()=>prepare(item)} style={{padding:"10px 14px",border:"1px solid #777",borderRadius:8}}>Prepare paid tenant for review</button>}{item.status==="ready"&&<div style={{padding:12,border:"1px solid #ddd",borderRadius:8}}><strong>Customer activation:</strong> {item.review?.activation_email_sent_at?"Welcome-to-BMS email sent":"Activation email pending"}{item.review?.activation_email_error&&<p role="alert">{item.review.activation_email_error}</p>}{!item.review?.activation_email_sent_at&&<button disabled={busy===item.tenant_id} onClick={async()=>{setBusy(item.tenant_id);try{const r=await fetch("/api/internal/bms-onboarding",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({tenantId:item.tenant_id,action:"send_activation"})});const d=await r.json();if(!r.ok)throw Error(d.error||"Could not send");await load(token)}catch(e:any){setError(e.message)}finally{setBusy("")}}}>Retry customer activation email</button>}</div>}<h3>Configuration checklist</h3>
   <ul>{(item.proposed_config?.tasks||[]).map((t:any)=><li key={t.key}>{t.label}: {t.status}</li>)}</ul>
   <label style={{display:"block"}}>Internal review notes<textarea id={"notes-"+item.tenant_id} defaultValue={item.review?.review_notes||""} rows={3} style={{display:"block",width:"100%",margin:"8px 0",border:"1px solid #bbb",padding:8}}/></label>
   {["submitted","awaiting_clarification","being_configured"].includes(item.status)&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["submitted","awaiting_clarification","being_configured"].map(status=><button key={status} disabled={busy===item.tenant_id} onClick={()=>update(item,status,(document.getElementById("notes-"+item.tenant_id) as HTMLTextAreaElement)?.value||"")} style={{padding:"10px 14px",border:"1px solid #aaa",borderRadius:8,cursor:"pointer"}}>{status.replaceAll("_"," ")}</button>)}</div>}
   {["submitted","being_configured"].includes(item.status)&&<div style={{marginTop:16,padding:12,border:"1px solid #ddd",borderRadius:8}}><label>Verified BMS tenant ID <input id={"bms-"+item.tenant_id} defaultValue={item.review?.applied_bms_tenant_id||""} placeholder="Existing paid BMS tenant UUID" style={{width:"100%",padding:8,border:"1px solid #bbb"}}/></label><button disabled={busy===item.tenant_id} onClick={()=>{if(!window.confirm("Approve and apply configuration to the verified paid BMS tenant?"))return;update(item,"ready",(document.getElementById("notes-"+item.tenant_id) as HTMLTextAreaElement)?.value||"",(document.getElementById("bms-"+item.tenant_id) as HTMLInputElement)?.value||"")}} style={{padding:"10px 14px",marginTop:8,border:"1px solid #777",borderRadius:8}}>Verify billing and approve setup</button></div>}<p style={{fontSize:13}}>Final approval is withheld until verified tenant provisioning, permissions, modules, integrations and billing have been checked.</p>
  </section>)}
 </main>
}
