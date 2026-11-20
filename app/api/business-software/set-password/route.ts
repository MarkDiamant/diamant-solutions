import {NextResponse} from 'next/server';
import {runtimeTenant} from '@/lib/business-software/runtime';
import {centralAuth,centralRest} from '@/lib/business-software/db';
const AUTH='https://iepqggrfenfqrqyzqyed.supabase.co/auth/v1';
const PUBLIC_KEY='sb_publishable_ivTCLFGFroexc-3IHe25bg_qhzg_GIy';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
// Initial-password setup only. A one-use recovery proof does not by itself grant a password reset.
// The administrator must separately mark a verified passwordless account for this exact tenant.
export async function POST(req:Request){
 try{
  const url=new URL(req.url),origin=req.headers.get('origin');
  if(!origin||origin!==url.origin)return reply({error:'Open the secure setup link in your browser.'},403);
  const tenant=await runtimeTenant();if(!tenant?.id||tenant.status!=='active')return reply({error:'This business is not ready for sign-in.'},403);
  const d=await req.json().catch(()=>null);
  if(!d||typeof d.token_hash!=='string'||!/^[a-f0-9]{40,128}$/i.test(d.token_hash)||typeof d.password!=='string'||d.password.length<12||d.password.length>128)return reply({error:'Use your secure setup link and a password of 12 to 128 characters.'},400);
  const proof=await fetch(AUTH+'/verify',{method:'POST',headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json'},body:JSON.stringify({type:'recovery',token_hash:d.token_hash}),cache:'no-store',redirect:'error'});
  const p=await proof.json().catch(()=>({}));if(!proof.ok||!p.user?.id)return reply({error:'This setup link has expired or was used. Ask for a fresh link.'},400);
  const userId=String(p.user.id);
  const membership=await centralRest('business_software_users?tenant_id=eq.'+encodeURIComponent(tenant.id)+'&auth_user_id=eq.'+encodeURIComponent(userId)+'&status=eq.active&select=id,email&limit=2');
  const members=membership.ok?await membership.json():null;
  if(!Array.isArray(members)||members.length!==1||String(members[0].email||'').toLowerCase()!==String(p.user.email||'').toLowerCase())return reply({error:'This setup link is not for this business account.'},403);
  const lookup=await centralAuth('admin/users/'+encodeURIComponent(userId));
  const current=lookup.ok?await lookup.json():null;
  if(!current||current.app_metadata?.bms_initial_password_tenant!==tenant.id)return reply({error:'Initial password setup is not enabled for this account. No password was changed.'},403);
  const metadata={...current.app_metadata,bms_initial_password_tenant:null};
  const saved=await centralAuth('admin/users/'+encodeURIComponent(userId),{method:'PUT',body:JSON.stringify({password:d.password,app_metadata:metadata})});
  if(!saved.ok)return reply({error:'The password could not be saved. Ask for a fresh setup link.'},409);
  const account=await saved.json().catch(()=>null);if(account?.id!==userId||account?.app_metadata?.bms_initial_password_tenant)return reply({error:'Account setup needs administrator review before signing in.'},503);
  return reply({ok:true,login:'/login'});
 }catch{return reply({error:'Setup is temporarily unavailable. No sign-in session was created.'},503)}
}
