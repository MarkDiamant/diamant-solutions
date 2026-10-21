import {NextResponse} from 'next/server';
const ORIGIN='https://diamantsolutions.co.uk';
const SB=process.env.DS_SUPABASE_URL||'https://iepqggrfenfqrqyzqyed.supabase.co';
export async function POST(request){
 try{
  const {email,service}=await request.json();
  const address=String(email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)||!['website','business_software'].includes(service))return NextResponse.json({error:'Invalid sign-in request'},{status:400});
  const key=process.env.DS_SUPABASE_SERVICE_ROLE_KEY,mail=process.env.RESEND_API_KEY;
  if(!key||!mail)return NextResponse.json({error:'Sign-in email unavailable'},{status:503});
  const path=service==='website'?'/website-setup':'/setup';
  const response=await fetch(SB+'/auth/v1/admin/generate_link',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({type:'magiclink',email:address,redirect_to:ORIGIN+path,data:{service_type:service}}),cache:'no-store'});
  if(!response.ok){console.error('Setup login link generation failed',response.status);return NextResponse.json({error:'Could not prepare secure sign-in email'},{status:502})}
  const generated=await response.json(),token=generated.properties?.hashed_token||generated.hashed_token;
  if(!token)return NextResponse.json({error:'Could not prepare secure sign-in email'},{status:502});
  const url=ORIGIN+path+'?token_hash='+encodeURIComponent(token)+'&type=magiclink';
  const label=service==='website'?'Website':'BMS';
  const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+mail,'Content-Type':'application/json'},body:JSON.stringify({from:'Diamant Solutions <info@diamantsolutions.co.uk>',to:[address],subject:'Your Diamant Solutions '+label+' sign-in link',html:'<p>Use this secure link to continue your '+label+' setup:</p><p><a href="'+url+'">Continue '+label+' setup</a></p><p>This link takes you directly to diamantsolutions.co.uk.</p>',text:'Continue your '+label+' setup: '+url})});
  if(!sent.ok){console.error('Setup login email failed',sent.status);return NextResponse.json({error:'Could not send secure sign-in email'},{status:502})}
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Unable to send sign-in email'},{status:500})}
}
