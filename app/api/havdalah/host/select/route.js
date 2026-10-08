import {sayOrPlay} from '../../../../../lib/havdalahGoogleVoice';
import {getVoiceSettings,spoken,fillTemplate} from '../../../../../lib/havdalahVoiceSettings';
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
 const now=new Date(),caller=phone(form.get('From'));const settings=await getVoiceSettings();const speak=t=>sayOrPlay(spoken(t,settings),settings.voice);const time=t=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'long',hour:'numeric',minute:'2-digit',hour12:true}).format(t);
 const managed=await getManagedSlots(now).catch(()=>null);
 if(managed){
  const next=managed.find(s=>s.time.getTime()>=now.getTime()-10*60000&&s.hosts.some(h=>phone(h.phone)===caller));
  if(!next)return xml(speak('You are not assigned to an upcoming Havdalah session.')+'<Hangup/>');
  return xml(speak(fillTemplate(settings.host_welcome_text,{day:next.label,time:time(next.time)}))+'<Redirect method="POST">/api/havdalah/host/wait?slot='+next.slot+'&amp;id='+next.slotId+'</Redirect>');
 }
 const next=getUpcomingHavdalahSlots(now).find(s=>s.slot===1&&s.time.getTime()>=now.getTime()-10*60000);
 if(!next)return xml(speak('Host schedule is temporarily unavailable.')+'<Hangup/>');
 return xml(speak(fillTemplate(settings.host_welcome_text,{day:next.label,time:time(next.time)}))+'<Redirect method="POST">/api/havdalah/host/wait?slot='+next.slot+'</Redirect>');
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
