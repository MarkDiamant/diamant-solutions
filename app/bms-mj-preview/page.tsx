"use client";
import {useEffect,useState} from "react";
import {supabase,supabaseConfigured} from "../../lib/supabase-browser";

export default function TenantLoginPage(){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false);
 useEffect(()=>{if(!supabaseConfigured)return;supabase.auth.getSession().then(({data})=>{if(data.session?.access_token)window.location.replace("/")})},[]);
 async function handleSubmit(event:any){event.preventDefault();setLoading(true);setError("");const {error}=await supabase.auth.signInWithPassword({email,password});setPassword("");if(error){setError("Incorrect email or password");setLoading(false);return}window.location.assign("/");}
 return <main className="min-h-screen bg-[#f4f5f7] text-[#172b4d]">
  <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
   <section className="hidden bg-[#172b4d] p-12 text-white lg:flex lg:flex-col lg:justify-between">
    <div><div className="text-2xl font-black tracking-tight">Business <span className="text-[#e66a24]">Management</span></div><p className="mt-3 max-w-md text-sm leading-6 text-white/60">Jobs, customers, quotes, invoices, payments and your team — all in one place.</p></div>
    <div><p className="text-4xl font-black leading-tight">Run the whole job<br/>from enquiry to payment.</p><p className="mt-5 max-w-lg text-base leading-7 text-white/65">Secure access to your business workspace, configured for your company and your team.</p></div>
    <p className="text-xs font-bold text-white/35">Powered by Diamant Solutions</p>
   </section>
   <section className="flex items-center justify-center px-5 py-12 sm:px-10">
    <div className="w-full max-w-md">
     <div className="mb-8 lg:hidden"><div className="text-xl font-black">Business <span className="text-[#e66a24]">Management</span></div></div>
     <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e66a24]">Business software</p>
     <h1 className="mt-2 text-4xl font-black tracking-tight">Welcome back</h1>
     <p className="mt-3 text-sm leading-6 text-black/50">Sign in to your business management system.</p>
     {!supabaseConfigured?<p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Authentication is temporarily unavailable.</p>:
     <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <label className="block"><span className="mb-2 block text-sm font-bold">Email address</span><input value={email} onChange={e=>setEmail(e.target.value)} required type="email" autoComplete="email" className="h-13 w-full rounded-xl border border-black/15 bg-white px-4 text-base shadow-sm outline-none transition focus:border-[#e66a24] focus:ring-4 focus:ring-[#e66a24]/10"/></label>
      <label className="block"><span className="mb-2 block text-sm font-bold">Password</span><input value={password} onChange={e=>setPassword(e.target.value)} required type="password" autoComplete="current-password" className="h-13 w-full rounded-xl border border-black/15 bg-white px-4 text-base shadow-sm outline-none transition focus:border-[#e66a24] focus:ring-4 focus:ring-[#e66a24]/10"/></label>
      {error&&<p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <button type="submit" disabled={loading} className="h-13 w-full rounded-xl bg-[#e66a24] text-base font-black text-white shadow-sm transition hover:brightness-95 disabled:opacity-50">{loading?"Signing in...":"Sign in"}</button>
     </form>}
    </div>
   </section>
  </div>
 </main>;
}
