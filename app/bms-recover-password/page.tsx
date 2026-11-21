"use client";
import {FormEvent,useEffect,useRef,useState} from 'react';
export default function RecoveryPassword() {
 const [token,setToken] = useState('');
 const [email,setEmail] = useState('');
 const [requested,setRequested] = useState('');
 const [requestBusy,setRequestBusy] = useState(false);
 const [password,setPassword] = useState('');
 const [confirmation,setConfirmation] = useState('');
 const [error,setError] = useState('');
 const [busy,setBusy] = useState(false);
 const [done,setDone] = useState(false);
 const captured = useRef(false);
 useEffect(() => {
  if (captured.current) return;
  captured.current = true;
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  // Discard the refresh token and clear credentials from the address bar.
  // No session, cookie, localStorage or sessionStorage is created here.
  window.history.replaceState(null,'',window.location.pathname);
  const access = fragment.get('access_token') || '';
  if (fragment.get('type') !== 'recovery' || access.length < 20 || access.length > 8192 || /\s/.test(access)) {
   setError('This page needs a fresh password recovery link. Request one below if your link has expired.');
   return;
  }
  setToken(access);
 },[]);
 async function requestLink(event:FormEvent) {
  event.preventDefault();setRequested('');setRequestBusy(true);
  try {
   const response=await fetch('/api/business-software/request-recovery',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
   const result=await response.json().catch(()=>({}));
   setRequested(result.message||result.error||'The request could not be confirmed. Try later or contact support.');
  } catch {setRequested('The request could not be confirmed. Try later or contact support.');}
  finally {setRequestBusy(false);}
 }
 async function save(event:FormEvent) {
  event.preventDefault();
  setError('');
  if (password.length < 12 || password.length > 128) { setError('Use a password of 12 to 128 characters.'); return; }
  if (password !== confirmation) { setError('The passwords do not match.'); return; }
  setBusy(true);
  try {
   const response = await fetch('/api/business-software/recover-password', {method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_token:token,password})});
   const result = await response.json().catch(() => ({}));
   if (response.ok) setDone(true);
   else setError(result.error || 'The password result could not be confirmed. Try normal sign-in before requesting another link.');
  } catch {
   setError('Connection interrupted. Try normal sign-in before requesting another link.');
  } finally {
   setToken(''); setPassword(''); setConfirmation(''); setBusy(false);
  }
 }
 return <main><section><p className="brand">Business Management Software</p><h1>{done?'Your password is set':token?'Choose your password':'Request a fresh link'}</h1>{done?<><p>Sign in with your account email address and the password you just chose.</p><a href="/login">Continue to sign in</a></>:token?<><p>Use a password of 12 to 128 characters. Your recovery link expires after a short time.</p><form onSubmit={save}><label>New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy||!token} required/></label><label>Confirm password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy||!token} required/></label><button disabled={busy||!token}>{busy?'Saving...':'Set password'}</button></form></>:null}{error&&<p role="alert">{error}</p>}{!done&&!token&&<div className="request"><p>Enter your account email address. A new email link expires after one hour. Use the most recent email.</p><form onSubmit={requestLink}><label>Account email<input type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} required disabled={requestBusy}/></label><button disabled={requestBusy}>{requestBusy?'Requesting...':'Email me a fresh link'}</button></form>{requested&&<p role="status">{requested}</p>}</div>}</section><style jsx>{`
 .request{margin-top:20px}main{min-height:100vh;background:#f2f5f9;padding:64px 20px;box-sizing:border-box;color:#18304d;font-family:Arial,sans-serif}section{max-width:430px;margin:auto;background:white;border:1px solid #dce3eb;border-radius:18px;padding:30px;box-shadow:0 8px 32px #18304d0a}h1{font-size:28px;line-height:1.2;margin:22px 0 16px}p{font-size:14px;line-height:1.65}.brand{font-weight:700;color:#63758a}form{margin-top:26px;display:grid;gap:20px}label{display:block;font-size:14px;font-weight:600}input{display:block;box-sizing:border-box;width:100%;margin-top:8px;border:1px solid #a8b6c7;border-radius:8px;padding:13px;font:inherit;color:inherit}button,a{display:block;box-sizing:border-box;width:100%;border:0;border-radius:8px;background:#18304d;color:white;padding:14px;font-size:15px;font-weight:700;text-align:center;text-decoration:none}a{margin-top:22px}button{cursor:pointer}button:disabled{opacity:.5;cursor:default}[role=alert]{margin-top:22px;background:#fff0ed;color:#932d22;padding:12px;border-radius:8px}@media(max-width:480px){main{padding:32px 16px}section{padding:24px}h1{font-size:26px}}
 `}</style></main>;
}
