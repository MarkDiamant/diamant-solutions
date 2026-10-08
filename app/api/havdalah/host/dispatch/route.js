import {createClient} from '@supabase/supabase-js';
import {getManagedSlots} from '../../../../../lib/havdalahManaged';
export const runtime='nodejs';export const dynamic='force-dynamic';
const origin='https://diamantsolutions.co.uk';
export async function GET(request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return new Response('Unauthorized',{status:401});
 const db=createClient(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.DS_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const now=new Date(),slots=await getManagedSlots(now);
 if(!slots)return Response.json({error:'Managed schedule unavailable'},{status:503});
 const sid=process.env.TWILIO_ACCOUNT_SID,key=process.env.TWILIO_API_KEY_SID,secret=process.env.TWILIO_API_KEY_SECRET;
 if(!sid||!key||!secret)return Response.json({error:'Twilio credentials unavailable'},{status:503});
 const auth='Basic '+Buffer.from(key+':'+secret).toString('base64');
 const results=[];
 for(const slot of slots){
  const elapsed=(now-slot.time)/60000;
  if(elapsed<0||elapsed>15||!slot.hosts.length)continue;
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:slot.location.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(slot.time);
  const conferences=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+sid+'/Conferences.json?Status=in-progress&FriendlyName='+encodeURIComponent(slot.conference),{headers:{Authorization:auth}});
  if(!conferences.ok){results.push({slot:slot.slot,error:'Conference lookup failed'});continue;}
  const data=await conferences.json();
  let hasHost=false;
  for(const conf of data.conferences||[]){
   if(conf.friendly_name!==slot.conference)continue;
   const p=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+sid+'/Conferences/'+conf.sid+'/Participants.json',{headers:{Authorization:auth}});
   if(p.ok){const j=await p.json();if((j.participants||[]).some(x=>x.label==='host-primary'))hasHost=true;}
  }
  if(hasHost)continue;
  const eligible=slot.hosts.filter(h=>elapsed>=((h.priority||1)-1)*3).sort((a,b)=>a.priority-b.priority);
  if(!eligible.length)continue;
  const host=eligible[eligible.length-1];
  const {error}=await db.from('havdalah_host_dispatch').insert({slot_id:slot.slotId,session_date:date,host_id:host.id,status:'pending'});
  if(error){if(error.code!=='23505')results.push({slot:slot.slot,error:error.message});continue;}
  const params=new URLSearchParams({To:host.phone,From:process.env.HAVDALAH_TWILIO_NUMBER||'+442039122476',Url:origin+'/api/havdalah/voice',Method:'POST'});
  const call=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+sid+'/Calls.json',{method:'POST',headers:{Authorization:auth,'Content-Type':'application/x-www-form-urlencoded'},body:params});
  const body=await call.json().catch(()=>({}));
  await db.from('havdalah_host_dispatch').update({status:call.ok?'called':'failed',call_sid:body.sid||null}).eq('slot_id',slot.slotId).eq('session_date',date).eq('host_id',host.id);
  results.push({slot:slot.slot,priority:host.priority,called:call.ok});
 }
 return Response.json({checked:slots.length,results});
}
