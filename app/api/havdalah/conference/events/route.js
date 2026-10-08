import {verifyTwilio} from '../../../../../lib/havdalahTwilioAuth';
import {getManagedSlots} from '../../../../../lib/havdalahManaged';
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
   const slots=await getManagedSlots(new Date()).catch(()=>[]);
   const active=slots?.find(s=>s.time.getTime()<=Date.now()&&s.time.getTime()>Date.now()-45*60000);
   if(active&&active.hosts.length>1){
    const {sid,auth}=credentials();
    const participants=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+sid+'/Conferences/'+conference+'/Participants.json?PageSize=100',{headers:{Authorization:auth}});
    if(participants.ok){
     const data=await participants.json();
     if(!(data.participants||[]).some(p=>p.label==='host-primary')){
      const backup=active.hosts.find(h=>h.priority>1);
      const from=process.env.HAVDALAH_TWILIO_NUMBER||process.env.TWILIO_PHONE_NUMBER||'+442039122476';
      if(backup){
       const params=new URLSearchParams({To:backup.phone,From:from,Url:'https://diamantsolutions.co.uk/api/havdalah/voice',Method:'POST'});
       const result=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+sid+'/Calls.json',{method:'POST',headers:{Authorization:auth,'Content-Type':'application/x-www-form-urlencoded'},body:params});
       if(!result.ok)throw Error('Backup call failed: '+result.status);
      }
     }
    }
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
