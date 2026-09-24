"use client";
import {useEffect,useState} from "react";

export default function TenantLoginPage(){
 const [tenantName,setTenantName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false);
 useEffect(()=>{fetch("/api/business-software/manifest",{cache:"no-store"}).then(async r=>{if(r.ok){const b=await r.json();if(b.name)setTenantName(String(b.name).replace(/\s+BMS$/,""))}}).catch(()=>{})},[]);
 async function handleSubmit(event:any){event.preventDefault();setLoading(true);setError("");const response=await fetch("/api/business-software/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});const data=await response.json().catch(()=>({}));if(!response.ok){setError(data.error||"Unable to sign in");setLoading(false);return}window.location.assign("/");}
 return <main style={{minHeight:"100vh",background:"#f5f5f2",display:"grid",placeItems:"center",padding:"24px",fontFamily:"Arial,Helvetica,sans-serif",color:"#172b4d"}}>
  <div style={{width:"100%",maxWidth:430,background:"#fff",border:"1px solid #00000018",borderRadius:24,padding:"32px",boxShadow:"0 14px 50px rgba(0,0,0,.08)"}}>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:18,marginBottom:18}}><img src="/api/business-software/icon" alt={tenantName||"Business logo"} style={{height:52,width:"auto",maxWidth:170,objectFit:"contain"}}/><span style={{fontSize:11,fontWeight:800,color:"#98a2b3"}}>Business Management Software</span></div>
   <h1 style={{fontSize:34,lineHeight:1.1,margin:"10px 0 8px",fontWeight:900}}>{tenantName?"Welcome "+tenantName:"Welcome"}</h1>
   <p style={{margin:"0 0 26px",fontSize:14,color:"#667085"}}>Sign in to continue.</p>
   <form onSubmit={handleSubmit}>
    <label style={{display:"block",fontSize:14,fontWeight:700,marginBottom:16}}>Email<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" autoComplete="email" style={{display:"block",width:"100%",height:48,marginTop:7,border:"1px solid #d0d5dd",borderRadius:12,padding:"0 13px",fontSize:16,boxSizing:"border-box"}}/></label>
    <label style={{display:"block",fontSize:14,fontWeight:700,marginBottom:16}}>Password<input value={password} onChange={e=>setPassword(e.target.value)} required type="password" autoComplete="current-password" style={{display:"block",width:"100%",height:48,marginTop:7,border:"1px solid #d0d5dd",borderRadius:12,padding:"0 13px",fontSize:16,boxSizing:"border-box"}}/></label>
    {error&&<p style={{background:"#fef2f2",color:"#b42318",padding:12,borderRadius:10,fontSize:14,fontWeight:700}}>{error}</p>}
    <button type="submit" disabled={loading} style={{width:"100%",height:50,border:0,borderRadius:12,background:"#e66a24",color:"#fff",fontSize:16,fontWeight:900,cursor:"pointer"}}>{loading?"Signing in...":"Login"}</button>
   </form>
   <div style={{margin:"26px 0 0",paddingTop:18,borderTop:"1px solid #eaecf0",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{fontSize:10,color:"#98a2b3"}}>Powered by</span><a href="https://www.diamantsolutions.co.uk/" target="_blank" rel="noopener noreferrer" aria-label="Visit Diamant Solutions" style={{display:"inline-flex",background:"#172536",borderRadius:5,padding:"5px 7px"}}><img src="/diamant-solutions-logo.svg" alt="Diamant Solutions" style={{width:110,height:"auto",display:"block"}}/></a></div>
  </div>
 </main>;
}
