"use client";

import { useEffect, useState } from "react";

export default function ArchivePage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [products,setProducts]=useState<any[]>([]);
  const [productError,setProductError]=useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search,setSearch]=useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/jobs?archived=1", { cache: "no-store" });
    if (response.status === 401) { window.location.href = "/admin/login"; return; }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error || "Unable to load archive"); else { setJobs(body.jobs || []); setError(""); }
    const productResponse=await fetch("/api/admin/price-book/archived",{cache:"no-store"}).catch(()=>null);
    if(productResponse?.ok){const result=await productResponse.json().catch(()=>({}));setProducts(result.products||[]);setProductError("");}else setProductError("Archived products are unavailable for this account.");
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function restore(reference: string) {
    const response = await fetch(`/api/admin/jobs/${encodeURIComponent(reference)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job: { archived_at: null } }) });
    if (!response.ok) { setError("Could not restore job"); return; }
    await load();
  }

  return <main className="min-h-screen bg-[#f5f5f2] px-5 py-8 text-[#141414]"><div className="mx-auto max-w-5xl">
    <div className="flex items-start justify-between gap-4"><div><h1 className="mt-1 text-3xl font-black">Archive</h1><p className="mt-2 text-sm text-black/55">Archived records are kept permanently and can be restored at any time.</p></div></div>
    <div className="mt-5"><input aria-label="Search archived jobs" placeholder="Search reference, customer, address or status..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full max-w-lg rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--bms-accent-ink)]"/></div>
    {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    <div style={{height:28}} aria-hidden="true" /><section className="overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#f2f2ee] text-xs uppercase tracking-[0.08em] text-black/50"><tr><th className="px-4 py-3">Ref</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Job</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead><tbody>{jobs.filter((job)=>[job.reference,job.customerName,job.address,job.postcode,job.jobType,job.status].some(v=>String(v||"").toLowerCase().includes(search.trim().toLowerCase()))).map((job) => <tr key={job.id} className="border-t border-black/15"><td className="px-4 py-4 font-black text-[#e66a24]"><a href={`/admin/jobs/${job.reference}`}>{job.reference}</a></td><td className="px-4 py-4"><b>{job.customerName}</b><div className="text-xs text-black/45">{job.address} {job.postcode}</div></td><td className="px-4 py-4">{job.jobType}</td><td className="px-4 py-4">{String(job.status).replaceAll("_", " ")}</td><td className="px-4 py-4 text-right"><button onClick={() => void restore(job.reference)} className="rounded-lg border border-black/15 px-3 py-2 font-bold">Restore</button></td></tr>)}</tbody></table></div>{loading && <p className="p-8 text-center text-black/45">Loading...</p>}{!loading && jobs.length === 0 && <p className="p-8 text-center text-black/45">No archived jobs.</p>}</section>
    <section className="mt-7 overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="border-b border-black/10 px-4 py-4"><h2 className="text-lg font-black">Archived Price Book products ({products.length})</h2><p className="text-sm text-black/55">Removed from the active catalogue. Historical orders and stock records remain available.</p></div>{productError?<p className="p-4 text-sm text-amber-800">{productError}</p>:products.length?<div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr className="bg-[#f2f2ee]"><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Unit</th></tr></thead><tbody>{products.filter(p=>[p.name,p.sku].some(v=>String(v||"").toLowerCase().includes(search.trim().toLowerCase()))).map(p=><tr key={p.id} className="border-t border-black/10"><td className="px-4 py-3 font-semibold">{p.name}</td><td className="px-4 py-3">{p.sku||"None"}</td><td className="px-4 py-3">{p.unit||"Each"}</td></tr>)}</tbody></table></div>:<p className="p-4 text-sm text-black/55">No archived products.</p>}</section>
  </div></main>;
}
