"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../../lib/supabase-browser";

const TENANT_ID = "3ebc2265-8842-4826-b464-71783d6cf841";
const RESOURCES = ["jobs", "customers", "payments", "quotes", "costs", "files", "invoices", "people", "assignments", "audit"];

export default function MjStagingPreview() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resource, setResource] = useState("jobs");
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [xeroStatus, setXeroStatus] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session?.access_token) window.location.replace("/bms-runtime"); }, [session?.access_token]);

  async function signIn(event) {
    event.preventDefault();
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPassword("");
    if (error) setMessage("Sign-in failed. Check your email and password.");
  }

  useEffect(() => {
    if (!session?.access_token) { setRows([]); return; }
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/business-software/tenant-data?" + new URLSearchParams({ tenant_id: TENANT_ID, resource }), {
      headers: { Authorization: "Bearer " + session.access_token },
      signal: controller.signal,
      cache: "no-store",
    }).then(async response => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Preview data unavailable");
      setRows(payload.data);
      setMessage("");
    }).catch(error => { if (error.name !== "AbortError") setMessage(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session?.access_token, resource]);

  async function addFinancialRecord() {
    if (!session?.access_token || !["payments", "costs"].includes(resource)) return;
    const job_id = window.prompt("Existing job UUID:");
    if (!job_id) return;
    const values = { job_id };
    if (resource === "payments") {
      const direction = window.prompt("Direction: customer_in or subcontractor_out", "customer_in");
      const payment_type = window.prompt("Payment type:", "payment");
      const amount = window.prompt("Amount in GBP:");
      if (!direction || !payment_type || amount === null) return;
      Object.assign(values, { direction, payment_type, amount });
    } else {
      const category = window.prompt("Cost category:");
      const actual_amount = window.prompt("Actual cost in GBP (leave blank if unknown):");
      if (!category || actual_amount === null) return;
      Object.assign(values, { category, ...(actual_amount.trim() ? { actual_amount } : {}) });
    }
    try {
      const response = await fetch("/api/business-software/staging-finance", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ tenant_id: TENANT_ID, resource, values }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Creation failed");
      setRows(current => [payload.record, ...current]);
      setMessage("Created in isolated staging only. Live M&J remains unchanged.");
    } catch (error) { setMessage(error.message); }
  }

  useEffect(() => {
    if (!session?.access_token) { setXeroStatus(null); return; }
    fetch("/api/business-software/staging-xero-status", {
      headers: { Authorization: "Bearer " + session.access_token }, cache: "no-store"
    }).then(r => r.json()).then(setXeroStatus).catch(() => setXeroStatus(null));
  }, [session?.access_token]);

  async function connectXero() {
    if (!session?.access_token) return;
    setMessage("");
    try {
      const response = await fetch("/api/business-software/staging-xero", {
        method: "POST",
        headers: { Authorization: "Bearer " + session.access_token },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Xero connection unavailable");
      window.location.assign(payload.url);
    } catch (error) { setMessage(error.message); }
  }

  async function updateRecord(row) {
    if (!session?.access_token || !["jobs", "customers"].includes(resource)) return;
    const field = window.prompt("Field to update (" + (resource === "jobs" ? "status, manager, next_action, internal_notes, job_type" : "first_name, last_name, phone, email, address_line_1, city, postcode") + "):");
    if (!field) return;
    const value = window.prompt("New value for " + field + ":", String(row[field] ?? ""));
    if (value === null) return;
    setMessage("");
    try {
      const response = await fetch("/api/business-software/tenant-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ tenant_id: TENANT_ID, resource, id: row.id, values: { [field]: value } }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Update failed");
      setRows(current => current.map(item => item.id === row.id ? { ...item, [field]: value } : item));
      setMessage("Staging record updated. Live M&J was not changed.");
    } catch (error) { setMessage(error.message); }
  }

  async function downloadPrivateFile(path) {
    if (!session?.access_token) return;
    setMessage("");
    try {
      const response = await fetch("/api/business-software/private-file", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ tenant_id: TENANT_ID, path }),
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Download unavailable");
      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch (error) { setMessage(error.message); }
  }

  if (!supabaseConfigured) {
    return <main style={{ padding: 32 }}><h1>M&J Management</h1><p>Authentication is temporarily unavailable.</p></main>;
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#f4f6f9] px-5 py-12 text-[#183153]">
    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#e4eaf0] bg-white shadow-xl shadow-[#183153]/10">
      <div className="bg-[#17385f] px-7 py-9 text-white sm:px-9">
        <div className="mb-7 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-lg font-black tracking-tight">M&J</div>
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-white/80">Sign in to your M&J management system.</p>
      </div>
      <div className="px-7 py-8 sm:px-9">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900"><span className="h-2 w-2 rounded-full bg-amber-500" />Secure business access</div>
        <form onSubmit={signIn} className="space-y-5">
          <div><label htmlFor="mj-email" className="mb-2 block text-sm font-semibold">Email address</label><input id="mj-email" type="email" autoComplete="username" inputMode="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@mjmetal.co.uk" required className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition focus:border-[#17385f] focus:ring-4 focus:ring-[#17385f]/10" /></div>
          <div><label htmlFor="mj-password" className="mb-2 block text-sm font-semibold">Password</label><input id="mj-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" required className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition focus:border-[#17385f] focus:ring-4 focus:ring-[#17385f]/10" /></div>
          {message && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{message}</p>}
          <button type="submit" className="w-full rounded-xl bg-[#17385f] px-5 py-3.5 text-base font-bold text-white transition hover:bg-[#102c4b] focus:outline-none focus:ring-4 focus:ring-[#17385f]/20">Sign in securely</button>
        </form>
        <p className="mt-7 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-500">M&J Metal business management system.</p>
      </div>
    </div>
  </main>;
}
