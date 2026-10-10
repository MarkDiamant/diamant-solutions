import {sayOrPlay} from '../../../../../lib/havdalahGoogleVoice';
import {getVoiceSettings,spoken,fillTemplate,occasionForSlot} from '../../../../../lib/havdalahVoiceSettings';
import {verifyTwilio} from '../../../../../lib/havdalahTwilioAuth';
import {getManagedSlots} from '../../../../../lib/havdalahManaged';
import {getUpcomingHavdalahSlots} from '../../../../../lib/havdalahSchedule';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function xml(body){return new Response('<?xml version="1.0" encoding="UTF-8"?><Response>'+body+'</Response>',{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});}
function phone(v){return String(v||'').replace(/[^+\d]/g,'');}
export async function POST(request){
 const form=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,form)))return new Response('Forbidden',{status:403});
 const now=new Date(),caller=phone(form.get('From'));const settings=await getVoiceSettings();const speak=t=>sayOrPlay(spoken(t,settings),settings.voice);const time=t=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'numeric',minute:'2-digit',hour12:true}).format(t);const date=t=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'long'}).format(t);
 const remaining=t=>{const m=Math.max(0,Math.ceil((t-now)/60000));const h=Math.floor(m/60),r=m%60;return h?(h+' hour'+(h===1?'':'s')+(r?' and '+r+' minute'+(r===1?'':'s'):'')):(m+' minute'+(m===1?'':'s'))};
 const hostReply=next=>{const early=next.time.getTime()-now.getTime()>3600000;const vars={day:occasionForSlot(next,settings),date:date(next.time),time:time(next.time),remaining:remaining(next.time)};return speak(fillTemplate(early?settings.host_early_text:settings.host_welcome_text,vars))+(early?'<Hangup/>':'<Redirect method="POST">/api/havdalah/host/wait?slot='+next.slot+(next.slotId?'&amp;id='+next.slotId:'')+'</Redirect>')};
 const managed=await getManagedSlots(now).catch(()=>null);
 if(managed){
  const next=managed.find(s=>s.time.getTime()>=now.getTime()-5000&&s.hosts.some(h=>phone(h.phone)===caller));
  if(!next)return xml(speak('You are not assigned to an upcoming Havdalah session.')+'<Hangup/>');
  return xml(hostReply(next));
 }
 return xml(speak('Host schedule is temporarily unavailable. Please try again shortly.')+'<Hangup/>');
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
