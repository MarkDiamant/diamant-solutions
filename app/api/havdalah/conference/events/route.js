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
 if(!res.ok)throw new Error('Twilio conference update failed: '+res.status);
}
export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 const form=await request.formData().catch(()=>new FormData());
 const event=String(form.get('StatusCallbackEvent')||'');
 const conference=String(form.get('ConferenceSid')||'');
 const label=String(form.get('ParticipantLabel')||'');
 const call=String(form.get('CallSid')||'');
 try{
  if(!/^CF[a-fA-F0-9]{32}$/.test(conference))return new Response(null,{status:204});
  if(event==='participant-join'&&label==='host-primary'){
   const url=new URL('/api/havdalah/announcement',request.url).toString();
   await twilio('Conferences/'+conference+'.json',{AnnounceUrl:url,AnnounceMethod:'POST'});
  }
  if(event==='participant-leave'&&label==='host-primary'){
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
