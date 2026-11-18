"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase-browser";
export default function InternalOnboarding(){
 const [email,setEmail]=useState(""),[loginNotice,setLoginNotice]=useState(""),[loginBusy,setLoginBusy]=useState(false);
 const [quoteTenant,setQuoteTenant]=useState(""),[quoteUsers,setQuoteUsers]=useState(""),[quoteResult,setQuoteResult]=useState<any>(null),[quoteBusy,setQuoteBusy]=useState(false);
 const [items,setItems]=useState<any[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(""),[token,setToken]=useState("");
 async function load(t:string){
  const r=await fetch("/api/internal/bms-onboarding",{headers:{Authorization:"Bearer "+t},cache:"no-store"});
  const data=await r.json().catch(()=>({}));if(!r.ok){setError(data.error||"Unable to load queue");return;}
  setItems(data.items||[]);setError("");
 }
 useEffect(()=>{let active=true;const apply=(session:any)=>{if(!active)return;const t=session?.access_token||"";setToken(t);if(t)load(t);else setError("Sign in with your authorised Diamant Solutions administrator account.")};supabase.auth.getSession().then(({data})=>apply(data.session));const {data}=supabase.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>apply(session),0)});return()=>{active=false;data.subscription.unsubscribe()}},[]);
 async function signIn(e:any){e.preventDefault();setLoginBusy(true);setLoginNotice("");setError("");try{const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:false,emailRedirectTo:window.location.origin+"/internal/bms-onboarding"}});if(error)throw error;setLoginNotice("If this is an existing account, check your email for a secure sign-in link. Administrator access is checked after sign-in.")}catch(e:any){setError(e.message||"Unable to send sign-in link")}finally{setLoginBusy(false)}}

 async function previewUpgrade(e:any){e.preventDefault();setQuoteBusy(true);setQuoteResult(null);setError("");try{const r=await fetch("/api/internal/bms-onboarding/seats",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({action:"quote",tenantId:quoteTenant,targetTotalUsers:Number(quoteUsers)})});const d=await r.json();if(!r.ok)throw Error(d.error||"Unable to preview upgrade");setQuoteResult(d.quote)}catch(e:any){setError(e.message||"Unable to preview upgrade")}finally{setQuoteBusy(false)}}
 async function prepare(item:any){
  setBusy(item.tenant_id);
  try{
   const r=await fetch("/api/internal/bms-onboarding",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({tenantId:item.tenant_id,action:"prepare"})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||"Could not prepare paid tenant");
   await load(token);
  }catch(e:any){setError(e.message||"Preparation failed")}finally{setBusy("")}
 }
 async function prepareDraft(item:any){
  setBusy(item.tenant_id);
  try{
   const r=await fetch("/api/internal/bms-onboarding",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({tenantId:item.tenant_id,action:"prepare_draft"})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||"Could not prepare draft tenant");
   await load(token);
  }catch(e:any){setError(e.message||"Draft preparation failed")}finally{setBusy("")}
 }
 async function update(item:any,status:string,notes:string,bmsTenantId?:string){
  setBusy(item.tenant_id);try{
   const r=await fetch("/api/internal/bms-onboarding",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({tenantId:item.tenant_id,status,notes,bmsTenantId})});
   const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"Could not save review");await load(token);
  }catch(e){setError(e.message)}finally{setBusy("")}
 }
 return <main style={{maxWidth:1100,margin:"auto",padding:24,fontFamily:"Arial,sans-serif"}}>
  <h1>Client onboarding reviews</h1><p>Internal configuration checklist. Customer systems remain unapproved until verified setup is complete.</p>
  {!token&&<section style={{maxWidth:480,border:"1px solid #ccd7e5",borderRadius:12,padding:20,margin:"20px 0"}}><h2 style={{fontSize:24,lineHeight:1.3,margin:"0 0 12px"}}>Administrator sign in</h2><p>Use your existing account email. This does not create an account or grant administrator access.</p><form onSubmit={signIn} style={{display:"grid",gap:12}}><label>Email address<input aria-label="Administrator email address" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{display:"block",width:"100%",boxSizing:"border-box",padding:10,border:"1px solid #aab",borderRadius:6}}/></label><button disabled={loginBusy} style={{padding:12,border:"1px solid #17385f",borderRadius:6,background:"#17385f",color:"white"}}>{loginBusy?"Sending…":"Email my sign-in link"}</button></form><p>Already use your password? <a href="/admin/havdalah">Use the existing administrator sign-in</a>, then return here.</p>{loginNotice&&<p role="status">{loginNotice}</p>}</section>}
  {error&&<p role="alert" style={{color:"#a11"}}>{error}</p>}
  {token&&<details style={{border:"1px solid #ccd7e5",padding:16,borderRadius:8,margin:"16px 0"}}><summary>Preview existing subscription user addition (read only)</summary><p>Preview only. This does not collect payment, record consent, change a subscription or grant access.</p><form onSubmit={previewUpgrade} style={{display:"grid",gap:10,maxWidth:520}}><label>Original tenant ID<input aria-label="Original tenant ID" required value={quoteTenant} onChange={e=>setQuoteTenant(e.target.value.trim())} style={{display:"block",width:"100%",boxSizing:"border-box",padding:8}}/></label><label>Target total users (including existing users)<input aria-label="Target total users" type="number" min="2" max="50" step="1" required value={quoteUsers} onChange={e=>setQuoteUsers(e.target.value)} style={{display:"block",padding:8}}/></label><button disabled={quoteBusy}>{quoteBusy?"Loading preview…":"Preview only - no payment"}</button></form>{quoteResult&&<pre role="status" style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:13}}>{JSON.stringify(quoteResult,null,2)}</pre>}</details>}
  <p>{items.length} onboarding applications</p>
  {items.map(item=><section key={item.tenant_id} style={{border:"1px solid #ddd",borderRadius:12,padding:20,margin:"18px 0"}}>
   <h2>{item.answers?.businessName||item.tenants?.name||"Unnamed business"}</h2>
   <p><strong>Status:</strong> {item.status} · <strong>Stored progress (legacy, unverified):</strong> {item.progress||0}% · <strong>Submitted:</strong> {item.submitted_at?new Date(item.submitted_at).toLocaleDateString("en-GB"):"Not submitted"}</p>
   <p><strong>Requested modules:</strong> {(item.proposed_config?.modules?.enabled||item.answers?.optionalModules||[]).join(", ")||"Not selected"}</p>
   {item.proposed_config?.completion?.needsClarification&&<div role="alert" style={{padding:12,background:"#fff3dd",border:"1px solid #b77"}}><strong>Unresolved questions.</strong> A draft tenant can be prepared with the confirmed information, but do not approve the setup until every answer is resolved.<ul>{(item.proposed_config.completion.unresolvedQuestions||[]).map((q:any)=><li key={q.key}>{q.label}</li>)}</ul><p>Return the questionnaire for clarification and replace the deferred answers with agreed details.</p></div>}
   <details><summary>Answers and proposed setup</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:12}}>{JSON.stringify({answers:item.answers,proposedConfiguration:item.proposed_config},null,2)}</pre></details>
   {["submitted","being_configured"].includes(item.status)&&!item.review?.applied_bms_tenant_id&&<button disabled={busy===item.tenant_id} onClick={()=>prepare(item)} style={{padding:"10px 14px",border:"1px solid #777",borderRadius:8}}>Prepare paid tenant for review</button>}{["submitted","awaiting_clarification","being_configured"].includes(item.status)&&!item.review?.applied_bms_tenant_id&&<div style={{marginTop:8}}><button disabled={busy===item.tenant_id} onClick={()=>prepareDraft(item)} style={{padding:"10px 14px",border:"1px solid #777",borderRadius:8}}>Prepare draft tenant</button><p style={{fontSize:13,margin:"6px 0 0"}}>Creates a suspended draft tenant only: nothing is activated, no customer emails are sent, billing is unchanged, and unresolved answers stay pending until they are resolved and the setup is approved.</p></div>}{item.review?.applied_bms_tenant_id&&!item.review?.approved_at&&<p style={{fontSize:13,padding:10,background:"#eef4fb",border:"1px solid #b9cbe0",borderRadius:8}}><strong>Draft tenant prepared:</strong> {item.review.applied_bms_tenant_id} - suspended, not activated. Outstanding answers remain pending; approve only when every answer is resolved.</p>}{item.status==="ready"&&<div style={{padding:12,border:"1px solid #ddd",borderRadius:8}}><strong>Customer activation:</strong> {item.review?.activation_email_sent_at?"Welcome-to-BMS email sent":"Activation email pending"}{item.review?.activation_email_error&&<p role="alert">{item.review.activation_email_error}</p>}{!item.review?.activation_email_sent_at&&<button disabled={busy===item.tenant_id} onClick={async()=>{setBusy(item.tenant_id);try{const r=await fetch("/api/internal/bms-onboarding",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({tenantId:item.tenant_id,action:"send_activation"})});const d=await r.json();if(!r.ok)throw Error(d.error||"Could not send");await load(token)}catch(e:any){setError(e.message)}finally{setBusy("")}}}>Retry customer activation email</button>}</div>}<h3>Configuration checklist</h3>
   <ul>{(item.proposed_config?.tasks||[]).map((t:any)=><li key={t.key}>{t.label}: {t.status}</li>)}</ul>
   <label style={{display:"block"}}>Internal review notes<textarea id={"notes-"+item.tenant_id} defaultValue={item.review?.review_notes||""} rows={3} style={{display:"block",width:"100%",margin:"8px 0",border:"1px solid #bbb",padding:8}}/></label>
   {["submitted","awaiting_clarification","being_configured"].includes(item.status)&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["submitted","awaiting_clarification","being_configured"].map(status=><button key={status} disabled={busy===item.tenant_id} onClick={()=>update(item,status,(document.getElementById("notes-"+item.tenant_id) as HTMLTextAreaElement)?.value||"")} style={{padding:"10px 14px",border:"1px solid #aaa",borderRadius:8,cursor:"pointer"}}>{status.replaceAll("_"," ")}</button>)}</div>}
   {["submitted","being_configured"].includes(item.status)&&<div style={{marginTop:16,padding:12,border:"1px solid #ddd",borderRadius:8}}><label>Verified BMS tenant ID <input id={"bms-"+item.tenant_id} defaultValue={item.review?.applied_bms_tenant_id||""} placeholder="Existing paid BMS tenant UUID" style={{width:"100%",padding:8,border:"1px solid #bbb"}}/></label><button disabled={busy===item.tenant_id} onClick={()=>{if(!window.confirm("Approve and apply configuration to the verified paid BMS tenant?"))return;update(item,"ready",(document.getElementById("notes-"+item.tenant_id) as HTMLTextAreaElement)?.value||"",(document.getElementById("bms-"+item.tenant_id) as HTMLInputElement)?.value||"")}} style={{padding:"10px 14px",marginTop:8,border:"1px solid #777",borderRadius:8}}>Verify billing and approve setup</button></div>}<p style={{fontSize:13}}>Final approval is withheld until verified tenant provisioning, permissions, modules, integrations and billing have been checked.</p>
  </section>)}
 </main>
}
