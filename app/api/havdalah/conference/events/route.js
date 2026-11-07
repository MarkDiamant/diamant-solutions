import {createClient} from '@supabase/supabase-js';
import {verifyTwilio} from '../../../../../lib/havdalahTwilioAuth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function credentials(){
 const sid=process.env.TWILIO_ACCOUNT_SID, key=process.env.TWILIO_API_KEY_SID,secret=process.env.TWILIO_API_KEY_SECRET;
 if(!sid||!key||!secret)throw new Error('Twilio credentials unavailable');
 return {sid,auth:'Basic '+Buffer.from(key+':'+secret).toString('base64')};
}
async function twilio(path,params){
 const {sid,auth}=credentials();
 const res=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+encodeURIComponent(sid)+'/'+path,{method:'POST',headers:{Authorization:auth,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params)});
 if(!res.ok)throw new Error('Twilio conference update failed: '+res.status+' '+(await res.text()).slice(0,500));
}
export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 const form=await request.formData().catch(()=>new FormData());
 const event=String(form.get('StatusCallbackEvent')||'');
 const conference=String(form.get('ConferenceSid')||'');
 const label=String(form.get('ParticipantLabel')||'');
 const call=String(form.get('CallSid')||'');
 const conferenceName=String(form.get('FriendlyName')||'');
 const callbackAccount=String(form.get('AccountSid')||'');
 if(event==='participant-join'&&label==='host-primary')console.info('HAVDALAH_HOST_CONFERENCE_DIAGNOSTIC',{conference,conferenceName,callbackAccountMatchesConfigured:callbackAccount===process.env.TWILIO_ACCOUNT_SID,callbackAccountPresent:/^AC[a-fA-F0-9]{32}$/.test(callbackAccount)});
 if(['participant-join','participant-leave','conference-start','conference-end'].includes(event)){
  try{
   const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
   const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.DS_SUPABASE_SERVICE_ROLE_KEY;
   if(!url||!key)throw Error('Database configuration unavailable');
   const db=createClient(url,key,{auth:{persistSession:false}});
   const eventKey=[conference,event,call,label].join(':');
   const {error}=await db.from('havdalah_call_events').upsert({event_key:eventKey,call_sid:call||null,conference_sid:conference||null,conference_name:conferenceName||null,participant_label:label||null,event_type:event},{onConflict:'event_key',ignoreDuplicates:true});
   if(error)throw error;
  }catch(e){console.error('HAVDALAH_CALL_LOG_ERROR',e);}
 }

 try{
  if(!/^CF[a-fA-F0-9]{32}$/.test(conference))return new Response(null,{status:204});
  if(event==='participant-join'&&label==='host-primary'){
   const {sid,auth}=credentials();
   const list=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+sid+'/Conferences/'+conference+'/Participants.json?PageSize=100',{headers:{Authorization:auth}});
   if(!list.ok)throw new Error('Conference participant lookup failed: '+list.status);
   const participants=(await list.json()).participants||[];
   const host=participants.find(p=>p.label==='host-primary');
   if(host?.muted){
    // Twilio cannot announce to an unbridged one-person conference.
    // Redirect the sole host call through its own countdown, then rejoin live.
    if(participants.length===1){
     const hostCall=host.call_sid||call;
     const name=encodeURIComponent(conferenceName);
     const countdown=new URL('/api/havdalah/host/solo-countdown?conference='+name,request.url).toString();
     await twilio('Calls/'+hostCall+'.json',{Url:countdown,Method:'POST'});
     console.info('HAVDALAH_SOLO_HOST_COUNTDOWN_REDIRECT',{conference,hostCall});
     return new Response(null,{status:204});
    }
    const url=new URL('/api/havdalah/announcement',request.url).toString();
    try{for(let attempt=0;attempt<4;attempt++){try{await twilio('Conferences/'+conference+'.json',{AnnounceUrl:url,AnnounceMethod:'POST'});break;}catch(error){if(!/404/.test(error.message)||attempt===3)throw error;await new Promise(resolve=>setTimeout(resolve,400*(attempt+1)));}}}
    catch(error){console.error('HAVDALAH_CONFERENCE_ANNOUNCEMENT_FAILED_TRYING_PARTICIPANTS',error.message,'callbackAccountMatchesConfigured',callbackAccount===process.env.TWILIO_ACCOUNT_SID);const results=await Promise.allSettled(participants.filter(p=>p.call_sid).map(p=>twilio('Conferences/'+conference+'/Participants/'+p.call_sid+'.json',{AnnounceUrl:url,AnnounceMethod:'POST'})));const failed=results.filter(r=>r.status==='rejected');if(failed.length)throw new Error('Countdown failed for '+failed.length+' conference participants; host remains muted');console.info('HAVDALAH_COUNTDOWN_PARTICIPANT_FALLBACK_STARTED',{conference,participantCount:results.length});}
   }
  }
  if(event==='participant-leave'&&(label==='host-primary'||label==='host-live')){
   const {sid,auth}=credentials();
   const list=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+sid+'/Conferences/'+conference+'/Participants.json?PageSize=100',{headers:{Authorization:auth}});
   if(!list.ok)throw new Error('Closing participant lookup failed: '+list.status);
   const data=await list.json();
   const closing=new URL('/api/havdalah/closing',request.url).toString();
   for(const participant of data.participants||[]){
    if(participant.label?.startsWith('listener-'))await twilio('Calls/'+participant.call_sid+'.json',{Url:closing,Method:'POST'});
   }
  }
  if(event==='announcement-end'){
   const {sid,auth}=credentials();
   const list=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+sid+'/Conferences/'+conference+'/Participants.json?PageSize=100',{headers:{Authorization:auth}});
   if(!list.ok)throw new Error('Twilio participant lookup failed: '+list.status);
   const data=await list.json();
   for(const participant of data.participants||[]){
    if(participant.label==='host-primary'&&participant.muted){
     await twilio('Conferences/'+conference+'/Participants/'+participant.call_sid+'.json',{Muted:'false'});
    }
   }
  }
 }catch(err){console.error('HAVDALAH_CONFERENCE_CONTROL_ERROR',err.message);return new Response('Conference control error',{status:500});}
 return new Response(null,{status:204});
}
