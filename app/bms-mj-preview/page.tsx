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
    <p>Isolated staging · Read-only verification · Not the live M&J system</p>
    {!session ? <form onSubmit={signIn}>
      <label>Email <input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>{" "}
      <label>Password <input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>{" "}
      <button type="submit">Sign in</button>
    </form> : <>
      <p>Signed in as {session.user.email} <button type="button" onClick={() => supabase.auth.signOut()}>Sign out</button></p>
      <nav aria-label="Preview data">{RESOURCES.map(name =>
        <button type="button" key={name} onClick={() => setResource(name)} aria-pressed={resource === name} style={{ marginRight: 8, fontWeight: resource === name ? "bold" : "normal" }}>{name}</button>
      )}</nav>
      <p>{loading ? "Loading…" : rows.length + " records"}</p>
      <div style={{ overflowX: "auto" }}><table><thead><tr>{rows[0] && Object.keys(rows[0]).map(key => <th key={key} scope="col" style={{ padding: 8, textAlign: "left" }}>{key}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>{Object.values(row).map((value, index) =>
          <td key={index} style={{ padding: 8, borderTop: "1px solid #ccc", verticalAlign: "top" }}>{value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value)}</td>
        )}{resource === "files" && row.storage_path && <td><button type="button" onClick={() => downloadPrivateFile(row.storage_path)}>Private download</button></td>}</tr>)}</tbody></table></div>
    </>}
    {message && <p role="alert">{message}</p>}
  </main>;
}
