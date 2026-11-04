"use client";
import { friendlyError } from "../../lib/friendly-error";
import {BmsPage,BmsCard} from "./BmsUI";
import { useEffect, useState } from "react";
import { DEFAULT_CRM_CONFIG, type CrmConfig } from "@/lib/crm/config";

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [bankAuthorised,setBankAuthorised]=useState(false);
  const [unmatched,setUnmatched]=useState<any[]>([]),[jobOptions,setJobOptions]=useState<any[]>([]),[canReconcile,setCanReconcile]=useState(false),[selectedJobs,setSelectedJobs]=useState<Record<string,string>>({}),[matching,setMatching]=useState(false);
  const [lastSync,setLastSync]=useState<{status:string;finished_at:string;checked:number;imported:number;needs_review:number;error_message?:string}|null>(null);const [tenantName, setTenantName] = useState<string | null>(null); const [syncing,setSyncing]=useState(false),[syncResult,setSyncResult]=useState("");
  const [evidenceReference,setEvidenceReference]=useState(""),[evidence,setEvidence]=useState<any>(null),[evidenceLoading,setEvidenceLoading]=useState(false),[evidenceError,setEvidenceError]=useState("");
  async function checkInvoiceEvidence(){setEvidenceLoading(true);setEvidenceError("");setEvidence(null);try{const rr=await fetch("/api/admin/integrations/xero/invoice-evidence?reference="+encodeURIComponent(evidenceReference.trim()),{cache:"no-store"});const data=await rr.json().catch(()=>({}));if(!rr.ok)throw new Error(data.error||"Could not retrieve invoice evidence");setEvidence(data);}catch(e){setEvidenceError(e instanceof Error?e.message:"Could not retrieve invoice evidence");}finally{setEvidenceLoading(false);}}
  const [xeroAudit,setXeroAudit]=useState<any>(null),[xeroAuditBusy,setXeroAuditBusy]=useState(false),[xeroAuditError,setXeroAuditError]=useState("");
  async function loadXeroAudit(){setXeroAuditBusy(true);setXeroAuditError("");try{const [xr,br]=await Promise.all([fetch("/api/bms-live/integrations/xero/reconciliation-audit",{cache:"no-store"}),fetch("/api/bms-live/payments/customer-ledger-summary",{cache:"no-store"})]);const x=await xr.json().catch(()=>({})),b=await br.json().catch(()=>({}));if(!xr.ok)throw new Error(x.error||"Xero transaction evidence unavailable");setXeroAudit({...x,bms:br.ok?b:null});}catch(e){setXeroAuditError(e instanceof Error?e.message:"Xero reconciliation unavailable");}finally{setXeroAuditBusy(false);}}
  const [error, setError] = useState("");
  const [crmConfig,setCrmConfig]=useState<CrmConfig>(DEFAULT_CRM_CONFIG);
  const [organisations,setOrganisations]=useState<Array<{tenantId:string;tenantName?:string}>>([]);
  const [choosing,setChoosing]=useState(false);
  const [quickbooks,setQuickbooks]=useState<{connected:boolean;configured:boolean;company:string|null}>({connected:false,configured:false,company:null});
  const [googleConnected,setGoogleConnected]=useState(false),[googleEmail,setGoogleEmail]=useState<string|null>(null),[googleLoading,setGoogleLoading]=useState(true);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/integrations/xero/status", { cache: "no-store" });
    if (response.status === 401) { window.location.href = "/admin/login"; return; }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(friendlyError(body.error) || "Unable to check Xero");
    else { setConnected(Boolean(body.connected)); setBankAuthorised(Boolean(body.bankTransactionsAuthorised)); setTenantName(body.tenantName || null); setError(""); }
    setLoading(false);void loadSyncHistory();
  }

  useEffect(()=>{fetch("/api/admin/integrations/quickbooks/status",{cache:"no-store"}).then(async r=>{if(r.ok){const b=await r.json();setQuickbooks({connected:!!b.connected,configured:!!b.configured,company:b.company||null});}}).catch(()=>{});},[]);
  useEffect(()=>{const refresh=async()=>{const [receipts,jobs]=await Promise.all([fetch("/api/admin/integrations/xero/unmatched",{cache:"no-store"}),fetch("/api/admin/jobs",{cache:"no-store"})]);if(receipts.ok){const b=await receipts.json();setUnmatched(b.receipts||[]);}if(jobs.ok){const b=await jobs.json();setJobOptions((b.jobs||[]).filter((x:any)=>!x.isPlaceholder));setCanReconcile((b.permissions||[]).includes("manage_business_settings"));}};void refresh().catch(()=>{});},[]);
  useEffect(() => { void load(); const q=new URLSearchParams(window.location.search); if(q.get("xero")==="choose_org"){setChoosing(true);fetch("/api/admin/integrations/xero/organisations",{cache:"no-store"}).then(async r=>{const b=await r.json();if(r.ok)setOrganisations(b.organisations||[]);else {setChoosing(false);setError(b.error||"Unable to load Xero organisations");}}).catch(()=>setError("Unable to load Xero organisations"));} fetch("/api/admin/settings",{cache:"no-store"}).then(async r=>{if(r.ok){const b=await r.json();setCrmConfig(b.settings||DEFAULT_CRM_CONFIG);}}).catch(()=>{}); fetch("/api/admin/integrations/google/status",{cache:"no-store"}).then(async r=>{const b=await r.json().catch(()=>({}));if(r.ok){setGoogleConnected(Boolean(b.connected));setGoogleEmail(b.email||null);}setGoogleLoading(false);}).catch(()=>setGoogleLoading(false)); }, []);

  async function chooseOrganisation(tenantId:string){setError("");const r=await fetch("/api/admin/integrations/xero/organisations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tenantId})});const b=await r.json().catch(()=>({}));if(!r.ok){setError(b.error||"Unable to connect Xero");return;}setChoosing(false);setOrganisations([]);window.history.replaceState({},"","/admin/integrations");await load();}

  async function loadSyncHistory(){try{const r=await fetch("/api/admin/integrations/xero/sync-history",{cache:"no-store"});if(r.ok){const b=await r.json();setLastSync(b.runs?.[0]||null);}}catch{}}
  async function syncNow(){setSyncing(true);setSyncResult("");setError("");try{const r=await fetch("/api/admin/integrations/xero/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}",cache:"no-store"});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||"Unable to sync Xero");setSyncResult("Checked "+(b.scanned??0)+" bank transactions; "+(b.imported??0)+" new receipts imported, "+(b.already_imported??0)+" already recorded, "+(b.needs_review??0)+" requiring review. "+(b.invoices_refreshed??0)+" invoices refreshed.");const [receipts,jobs]=await Promise.all([fetch("/api/admin/integrations/xero/unmatched",{cache:"no-store"}),fetch("/api/admin/jobs",{cache:"no-store"})]);if(receipts.ok)setUnmatched((await receipts.json()).receipts||[]);if(jobs.ok)setJobOptions(((await jobs.json()).jobs||[]).filter((x:any)=>!x.isPlaceholder));await loadSyncHistory();}catch(e){setError(e instanceof Error?e.message:"Xero sync failed");}finally{setSyncing(false);}}
  async function disconnect() {
    if (!window.confirm(`Disconnect Xero from ${crmConfig.businessName}?`)) return;
    const response = await fetch("/api/admin/integrations/xero/status", { method: "DELETE" });
    if (!response.ok) { setError("Unable to disconnect Xero"); return; }
    await load();
  }

  return (
    <BmsPage className="min-h-screen bg-[var(--bms-canvas)] px-4 py-7 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1900px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Integrations</h1><p className="mt-2 text-sm text-black/55">Connect the services your business uses. Connections are authorised by the provider and can be disconnected here.</p></div>
          
        </div>

<div className="mt-6 grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-4">        <section className="min-w-0 space-y-3"><h2 className="text-sm font-black uppercase tracking-wide text-slate-600">Accounting & bookkeeping</h2><BmsCard className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-lg font-bold tracking-tight text-slate-900">Xero</h2><p className="mt-1 text-sm leading-6 text-slate-600">Create and track customer invoices from your jobs.</p></div>
            {loading ? <span className="text-sm font-bold text-black/45">Checking...</span> : connected ? <span className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-black text-green-700">Connected</span> : <span className="rounded-full bg-orange-50 px-3 py-1.5 text-sm font-black text-orange-700">Not connected</span>}
<div className="flex flex-wrap items-center gap-2">
            {!connected ? <a href="/api/admin/integrations/xero/connect" className="bms-primary-button rounded-xl px-3 py-2 text-sm font-black text-white">Connect Xero</a> : <><button disabled={syncing} onClick={()=>void syncNow()} className="rounded-xl bg-[var(--bms-accent)] px-3 py-2 text-sm font-black text-white disabled:opacity-50">{syncing?"Syncing Xero…":"Sync Xero Now"}</button><button onClick={() => void disconnect()} className="rounded-xl border border-red-300 px-3 py-2 text-sm font-black text-red-700">Disconnect Xero</button></> }
          </div>          </div>

          {connected&&!bankAuthorised&&<div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-bold">Xero needs additional authorisation to read bank receipts.</p><p className="mt-1">Invoice access is connected, but bank transactions cannot synchronise until the additional Xero permission is approved.</p><a href="/api/admin/integrations/xero/connect" className="mt-3 inline-block rounded-lg bg-[var(--bms-accent)] px-4 py-2 font-bold text-white">Reconnect Xero and approve bank access</a></div>}{connected && <div className="mt-5 rounded-xl bg-[var(--bms-canvas)] p-4"><p className="text-xs font-bold uppercase tracking-[0.08em] text-black/45">Xero organisation</p><p className="mt-1 font-black">{tenantName || "Connected organisation"}</p></div>}
          {choosing&&<div className="mt-5 rounded-xl border border-black/10 p-4"><p className="font-black">Choose your Xero organisation</p><p className="mt-1 text-sm text-black/50">Select the organisation your business software should use.</p><div className="mt-3 flex flex-wrap gap-2">{organisations.map(o=><button type="button" key={o.tenantId} onClick={()=>void chooseOrganisation(o.tenantId)} className="rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-bold">{o.tenantName||"Xero organisation"}</button>)}</div></div>}{error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

          
          {lastSync&&<p className="mt-4 text-sm text-slate-600">Last Xero sync: {new Date(lastSync.finished_at).toLocaleString("en-GB")} · {lastSync.status} · {lastSync.checked} checked · {lastSync.imported} imported{lastSync.needs_review?" · "+lastSync.needs_review+" to review":""}{lastSync.error_message?" · "+lastSync.error_message:""}</p>}
          {syncResult&&<p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">{syncResult}</p>}
        </BmsCard>
        <BmsCard className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold tracking-tight text-slate-900">QuickBooks Online</h2><p className="mt-1 text-sm leading-6 text-slate-600">Connect an individual tenant's QuickBooks accounting company.</p></div><span className="text-sm font-bold">{quickbooks.connected?"Connected":quickbooks.configured?"Not connected":"Setup required"}</span></div>{quickbooks.connected&&<p className="mt-3 text-sm">Company ID: {quickbooks.company}</p>}{quickbooks.configured?<a href="/api/admin/integrations/quickbooks/connect" className="mt-4 inline-block rounded-lg bg-[var(--bms-accent)] px-4 py-2 text-sm font-bold text-white">{quickbooks.connected?"Reconnect QuickBooks":"Connect QuickBooks"}</a>:<p className="mt-3 text-sm text-slate-500">Setup required. An administrator must configure QuickBooks before it can be connected.</p>}</BmsCard>
        </section><section className="min-w-0 space-y-3"><h2 className="text-sm font-black uppercase tracking-wide text-slate-600">Email</h2><BmsCard className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-black/35">Email</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Gmail</h2><p className="mt-1 text-sm leading-6 text-slate-600">Send quotes, invoices and business emails from your connected business Gmail account.</p></div>{googleLoading?<span className="text-sm font-bold text-black/45">Checking...</span>:googleConnected?<span className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-black text-green-700">Connected</span>:<span className="rounded-full bg-orange-50 px-3 py-1.5 text-sm font-black text-orange-700">Not connected</span>}</div>{googleConnected&&<div className="mt-5 rounded-xl bg-[var(--bms-canvas)] p-4"><p className="text-xs font-bold uppercase tracking-[0.08em] text-black/45">Sending account</p><p className="mt-1 font-black">{googleEmail}</p><p className="mt-1 text-xs text-black/45">Quotes and business emails sent through Google will come from this mailbox on phone and desktop.</p></div>}<div className="mt-5">{googleConnected?<button onClick={async()=>{if(!confirm(`Disconnect ${googleEmail||"Gmail"}?`))return;const r=await fetch("/api/admin/integrations/google/status",{method:"DELETE"});if(r.ok){setGoogleConnected(false);setGoogleEmail(null);}}} className="rounded-xl border border-black/15 px-5 py-3 text-sm font-black">Disconnect Gmail</button>:<a href="/api/admin/integrations/google/connect" className="bms-primary-button rounded-xl px-5 py-3 text-sm font-black text-white">Connect Gmail</a>}</div>{new URLSearchParams(typeof window!=="undefined"?window.location.search:"").get("google")==="config_error"&&<p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Gmail setup is not yet available. Please contact support.</p>}</BmsCard><BmsCard className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold">Microsoft 365 / Outlook</h3><p className="text-xs text-slate-500">Business email connection</p></div><span className="text-xs font-bold text-slate-500">Planned</span></div></BmsCard></section><section className="min-w-0 space-y-3"><h2 className="text-sm font-black uppercase tracking-wide text-slate-600">Recommendations</h2>

        <BmsCard className="rounded-xl border border-[#62c653]/30 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-black/35">Recommendations</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Would Use Again</h2><p className="mt-1 max-w-xl text-sm leading-6 text-black/55">Request customer recommendations directly from completed jobs. Customer name, email, phone, job/service and the actual completion date are filled in automatically.</p></div><span className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-black text-green-700">Manual workflow available</span></div><div className="mt-4 rounded-xl bg-[var(--bms-canvas)] p-4 text-sm text-black/60"><b className="text-black">How it works:</b> open a completed job and choose <b>Request recommendation</b>. The Would Use Again request opens with that customer and job already filled in for review before sending. This is not an authorised email-provider connection or automated delivery.</div><a href="https://www.woulduseagain.com/" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-xl border border-[#62c653]/50 bg-[#f2faef] px-5 py-3 text-sm font-black text-[#2f8f45]">Open Would Use Again</a></BmsCard>

        </section><section className="min-w-0 space-y-3"><h2 className="text-sm font-black uppercase tracking-wide text-slate-600">Other integrations</h2><div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            
            ["Google Calendar","Sync site visits, appointments and scheduled work with your calendar.","Calendar"],
            ["Microsoft Outlook Calendar","Sync business appointments and scheduled work with Outlook.","Calendar"],
            ["Stripe","Take and reconcile customer payments from your jobs and invoices.","Payments"],
            
            ["Google Drive","Link job documents and business files where useful.","Files"],
            ["Microsoft OneDrive","Link job documents and business files where useful.","Files"],
          ].map(([name,description,category])=><BmsCard key={name} className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-black/35">{category}</p><h2 className="mt-1 text-lg font-black">{name}</h2></div><span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-bold text-black/45">Planned</span></div><p className="mt-2 text-sm leading-6 text-black/55">{description}</p></BmsCard>)}
        </div></section>
</div>      </div>
    </BmsPage>
  );
}

