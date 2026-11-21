"use client";
import {useEffect} from 'react';
export default function RetiredPasswordSetup(){
 useEffect(()=>{window.history.replaceState(null,'',window.location.pathname);},[]);
 return <main style={{minHeight:'100vh',background:'#f2f5f9',padding:'64px 20px',color:'#18304d',fontFamily:'Arial,sans-serif'}}><section style={{maxWidth:430,margin:'auto',background:'white',border:'1px solid #dce3eb',borderRadius:18,padding:30}}><p>Business Management Software</p><h1>Request a fresh password link</h1><p>This old setup link is no longer supported. Request a fresh email link to choose your password.</p><a href="/bms-recover-password" style={{display:'block',marginTop:24,borderRadius:8,background:'#18304d',color:'white',padding:14,textAlign:'center',textDecoration:'none'}}>Request a fresh link</a></section></main>;
}
