"use client";

import { useEffect, useState } from "react";

export default function ArchivePage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [products,setProducts]=useState<any[]>([]);
  const [productError,setProductError]=useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search,setSearch]=useState("");
  const [confirm,setConfirm]=useState<{id:string;name:string;action:"restore"|"delete"}|null>(null);
  const [referenceChecks,setReferenceChecks]=useState<Record<string,{ok:boolean;references?:string[];error?:string}>>({});
  const [working,setWorking]=useState(false);

  async function load() {
    setLoading(true);
    const [response,productResponse,checkResponse]=await Promise.all([fetch("/api/admin/jobs?archived=1",{cache:"no-store"}),fetch("/api/admin/price-book/archived",{cache:"no-store"}).catch(()=>null),fetch("/api/admin/price-book/archive-status",{cache:"no-store"}).catch(()=>null)]);
    if (response.status === 401) { window.location.href = "/admin/login"; return; }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error || "Unable to load archive"); else { setJobs(body.jobs || []); setError(""); }
    
    if(productResponse?.ok){const result=await productResponse.json().catch(()=>({}));setProducts(result.products||[]);setProductError("");const checks=checkResponse?.ok?(await checkResponse.json().catch(()=>({}))).checks||{}:{};setReferenceChecks(checks);}else setProductError("Archived products are unavailable for this account.");
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function restore(reference: string) {
    const response = await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job: { archived_at: null } }) });
    if (!response.ok) { setError("Could not restore job"); return; }
    await load();
  }

  async function changeProduct(){if(!confirm||working)return;setWorking(true);setProductError("");const current=confirm;try{const response=await fetch("/api/admin/price-book/"+(current.action==="restore"?"restore":"delete-permanently"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:current.id,...(current.action==="delete"?{confirm:"DELETE PERMANENTLY"}:{})})});const body=await response.json().catch(()=>({}));if(!response.ok||body.error)throw Error(body.error+(body.references?.length?": "+body.references.join(", "):"")||"Unable to update product");setConfirm(null);setProducts(v=>v.filter(p=>p.id!==current.id));void load()}catch(e){setProductError(e instanceof Error?e.message:String(e))}finally{setWorking(false)}}
  return <main className="min-h-screen bg-[#f5f5f2] px-5 py-8 text-[#141414]"><div className="mx-auto max-w-5xl">
    <div className="flex items-start justify-between gap-4"><div><h1 className="mt-1 text-3xl font-black">Archive</h1><p className="mt-2 text-sm text-black/55">Archived jobs and products can be restored. Products without historical references may also be permanently deleted.</p></div></div>
    <div className="mt-5"><input aria-label="Search archived jobs" placeholder="Search reference, customer, address or status..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full max-w-lg rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--bms-accent-ink)]"/></div>
    {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    <div style={{height:28}} aria-hidden="true" /><section className="overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="border-b border-black/10 px-4 py-4"><h2 className="text-lg font-black">Archived Jobs / Orders ({jobs.length})</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#f2f2ee] text-xs uppercase tracking-[0.08em] text-black/50"><tr><th className="px-4 py-3">Ref</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Job</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead><tbody>{jobs.filter((job)=>[job.reference,job.customerName,job.address,job.postcode,job.jobType,job.status].some(v=>String(v||"").toLowerCase().includes(search.trim().toLowerCase()))).map((job) => <tr key={job.id} className="border-t border-black/15"><td className="px-4 py-4 font-black text-[#e66a24]"><a href={`/admin/jobs/${job.reference}`}>{job.reference}</a></td><td className="px-4 py-4"><b>{job.customerName}</b><div className="text-xs text-black/45">{job.address} {job.postcode}</div></td><td className="px-4 py-4">{job.jobType}</td><td className="px-4 py-4">{String(job.status).replaceAll("_", " ")}</td><td className="px-4 py-4 text-right"><button onClick={() => void restore(job.reference)} className="rounded-lg border border-black/15 px-3 py-2 font-bold">Restore</button></td></tr>)}</tbody></table></div>{loading && <p className="p-8 text-center text-black/45">Loading...</p>}{!loading && jobs.length === 0 && <p className="p-8 text-center text-black/45">No archived jobs.</p>}</section>
    <section className="mt-9 overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="border-b border-black/10 px-4 py-4"><h2 className="text-lg font-black">Archived Price Book products ({products.length})</h2></div>{productError?<p className="p-4 text-sm text-amber-800">{productError}</p>:products.length?<div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr className="bg-[#f2f2ee]"><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{products.filter(p=>[p.name,p.sku].some(v=>String(v||"").toLowerCase().includes(search.trim().toLowerCase()))).map(p=><tr key={p.id} className="border-t border-black/10"><td className="px-4 py-3 font-semibold">{p.name}</td><td className="px-4 py-3">{p.sku||"None"}</td><td className="px-4 py-3">{p.unit||"Each"}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button type="button" disabled={working} className="rounded-lg border border-black/15 px-3 py-2 font-semibold" onClick={()=>setConfirm({id:p.id,name:p.name,action:"restore"})}>Restore</button><button type="button" disabled={working||!referenceChecks[p.id]?.ok} title={!referenceChecks[p.id]?.ok?(referenceChecks[p.id]?.references?.join(", ")||referenceChecks[p.id]?.error||"Historical references must be checked"):""} className="rounded-lg border border-red-300 px-3 py-2 font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40" onClick={()=>setConfirm({id:p.id,name:p.name,action:"delete"})}>Delete Permanently</button></div>{!referenceChecks[p.id]?.ok&&<p className="mt-1 text-xs text-black/55">Cannot delete: {referenceChecks[p.id]?.references?.join(", ")||referenceChecks[p.id]?.error||"Checking historical references"}</p>}</td></tr>)}</tbody></table></div>:<p className="p-4 text-sm text-black/55">No archived products.</p>}</section>
  {confirm&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"><div role="dialog" aria-modal="true" aria-label="Confirm archived product action" className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"><h3 className="px-5 py-4 text-lg font-bold text-white" style={{background:"var(--bms-accent,#365b85)"}}>{confirm.action==="delete"?"Permanently delete product?":"Restore product?"}</h3><div className="p-5"><p>Are you sure you want to {confirm.action==="delete"?"permanently delete":"restore"} <strong>{confirm.name}</strong>?</p>{confirm.action==="delete"&&<p className="mt-2 text-sm text-red-700">This cannot be undone. Deletion is blocked if any historical records reference the product.</p>}<div className="mt-5 flex justify-end gap-2"><button className="rounded-lg border px-4 py-2" disabled={working} onClick={()=>setConfirm(null)}>Cancel</button><button className="rounded-lg px-4 py-2 font-semibold text-white" style={{background:"var(--bms-accent,#365b85)"}} disabled={working} onClick={()=>void changeProduct()}>{working?"Working...":confirm.action==="delete"?"Delete Permanently":"Restore"}</button></div></div></div></div>}
  </div></main>;
}
