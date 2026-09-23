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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => subscription.unsubscribe();
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPassword("");
    if (error) setMessage("Sign-in failed. Check that this is the isolated staging preview.");
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

  if (process.env.NEXT_PUBLIC_BMS_STAGING_PREVIEW !== "true" || !supabaseConfigured) {
    return <main style={{ padding: 32 }}><h1>M&J migration preview</h1><p>Unavailable until this deployment is explicitly configured for isolated staging. Live M&J is unchanged.</p></main>;
  }

  return <main style={{ maxWidth: 1100, margin: "auto", padding: 32 }}>
    <h1>M&J migration preview</h1>
    <p>Isolated staging · Customer/job editing for authorised managers · Other sections read-only · Not the live M&J system</p>
    {!session ? <form onSubmit={signIn}>
      <label>Email <input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>{" "}
      <label>Password <input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>{" "}
      <button type="submit">Sign in</button>
    </form> : <>
      <p>Signed in as {session.user.email} <button type="button" onClick={() => supabase.auth.signOut()}>Sign out</button> <button type="button" onClick={connectXero}>Connect Xero to staging</button></p>
      <nav aria-label="Preview data">{RESOURCES.map(name =>
        <button type="button" key={name} onClick={() => setResource(name)} aria-pressed={resource === name} style={{ marginRight: 8, fontWeight: resource === name ? "bold" : "normal" }}>{name}</button>
      )}</nav>
      <p>{loading ? "Loading…" : rows.length + " records"} {["payments", "costs"].includes(resource) && <button type="button" onClick={addFinancialRecord}>+ Add staging {resource === "payments" ? "payment" : "cost"}</button>}</p>
      <div style={{ overflowX: "auto" }}><table><thead><tr>{rows[0] && Object.keys(rows[0]).map(key => <th key={key} scope="col" style={{ padding: 8, textAlign: "left" }}>{key}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>{Object.values(row).map((value, index) =>
          <td key={index} style={{ padding: 8, borderTop: "1px solid #ccc", verticalAlign: "top" }}>{value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value)}</td>
        )}{["jobs", "customers"].includes(resource) && <td><button type="button" onClick={() => updateRecord(row)}>Edit staging record</button></td>}{resource === "files" && row.storage_path && <td><button type="button" onClick={() => downloadPrivateFile(row.storage_path)}>Private download</button></td>}</tr>)}</tbody></table></div>
    </>}
    {message && <p role="alert">{message}</p>}
  </main>;
}
