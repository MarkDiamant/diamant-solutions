"use client";
import {useEffect,useState} from "react";
import {supabase,supabaseConfigured} from "../../lib/supabase-browser";

export default function TenantLoginPage(){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false);
 useEffect(()=>{if(!supabaseConfigured)return;supabase.auth.getSession().then(({data})=>{if(data.session?.access_token)window.location.replace("/")})},[]);
 async function handleSubmit(event:any){event.preventDefault();setLoading(true);setError("");const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error||!data.session?.access_token){setError("Incorrect email or password");setLoading(false);return}const check=await fetch("/api/business-software/session",{headers:{Authorization:`Bearer ${data.session.access_token}`}});if(!check.ok){await supabase.auth.signOut();setError("This account is not authorised for this business");setLoading(false);return}window.location.assign("/");}
 return <main style={{minHeight:"100vh",background:"#f5f5f2",display:"grid",placeItems:"center",padding:"24px",fontFamily:"Arial,Helvetica,sans-serif",color:"#172b4d"}}>
  <div style={{width:"100%",maxWidth:430,background:"#fff",border:"1px solid #00000018",borderRadius:24,padding:"32px",boxShadow:"0 14px 50px rgba(0,0,0,.08)"}}>
   <div style={{fontSize:13,fontWeight:900,letterSpacing:"1.5px",textTransform:"uppercase",color:"#e66a24"}}>M&amp;J Metal</div>
   <h1 style={{fontSize:34,lineHeight:1.1,margin:"10px 0 8px",fontWeight:900}}>Welcome to M&amp;J Management</h1>
   <p style={{margin:"0 0 26px",fontSize:14,color:"#667085"}}>Sign in to continue.</p>
   {!supabaseConfigured?<p>Authentication is temporarily unavailable.</p>:<form onSubmit={handleSubmit}>
    <label style={{display:"block",fontSize:14,fontWeight:700,marginBottom:16}}>Email<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" autoComplete="email" style={{display:"block",width:"100%",height:48,marginTop:7,border:"1px solid #d0d5dd",borderRadius:12,padding:"0 13px",fontSize:16,boxSizing:"border-box"}}/></label>
    <label style={{display:"block",fontSize:14,fontWeight:700,marginBottom:16}}>Password<input value={password} onChange={e=>setPassword(e.target.value)} required type="password" autoComplete="current-password" style={{display:"block",width:"100%",height:48,marginTop:7,border:"1px solid #d0d5dd",borderRadius:12,padding:"0 13px",fontSize:16,boxSizing:"border-box"}}/></label>
    {error&&<p style={{background:"#fef2f2",color:"#b42318",padding:12,borderRadius:10,fontSize:14,fontWeight:700}}>{error}</p>}
    <button type="submit" disabled={loading} style={{width:"100%",height:50,border:0,borderRadius:12,background:"#e66a24",color:"#fff",fontSize:16,fontWeight:900,cursor:"pointer"}}>{loading?"Signing in...":"Login"}</button>
   </form>}
   <p style={{margin:"24px 0 0",textAlign:"center",fontSize:11,color:"#98a2b3"}}>Powered by Diamant Solutions</p>
  </div>
 </main>;
}
