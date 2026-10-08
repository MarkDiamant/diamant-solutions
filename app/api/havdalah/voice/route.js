import {sayOrPlay} from '../../../../lib/havdalahGoogleVoice';
import {getVoiceSettings,spoken,activeSponsor} from '../../../../lib/havdalahVoiceSettings';
import {verifyTwilio} from '../../../../lib/havdalahTwilioAuth';
import {getNextHavdalahSlot} from '../../../../lib/havdalahSchedule';
import {getManagedSlots} from '../../../../lib/havdalahManaged';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const TZ='Europe/London';

function x(v=''){return String(v).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));}
function time(d,tz=TZ){return new Intl.DateTimeFormat('en-GB',{timeZone:tz,weekday:'long',hour:'numeric',minute:'2-digit',hour12:true}).format(d);}
function left(t,n){const m=Math.max(0,Math.ceil((t-n)/60000));if(m<60)return `${m} minute${m===1?'':'s'}`;const h=Math.floor(m/60),r=m%60;return r?`${h} hour${h===1?'':'s'} and ${r} minute${r===1?'':'s'}`:`${h} hour${h===1?'':'s'}`;}
function phone(v=''){return String(v).replace(/[^+\d]/g,'');}
function host(v=''){return (process.env.HAVDALAH_HOST_NUMBERS||'').split(',').map(phone).filter(Boolean).includes(phone(v));}
function xml(body){return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});}

export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 const form=await request.formData().catch(()=>new FormData());
 const now=new Date();
 const settings=await getVoiceSettings();
 console.log('HAVDALAH_VOICE_SELECTED',{voice:settings.voice,googleKeyPresent:!!process.env.GOOGLE_TTS_API_KEY,signingTokenPresent:!!process.env.TWILIO_AUTH_TOKEN});
 const managed=await getManagedSlots(now,phone(form.get('To'))).catch(error=>{console.error('HAVDALAH_MANAGED_LOOKUP',error);return null;});
 const assigned=managed?.find(s=>s.hosts.some(h=>phone(h.phone)===phone(form.get('From')))&&s.time.getTime()>=now.getTime()-10*60000);
 if(assigned)return xml(`<Redirect method="POST">/api/havdalah/host/wait?slot=${assigned.slot}&amp;id=${assigned.slotId}</Redirect>`);
 if(host(form.get('From'))) return xml('<Redirect method="POST">/api/havdalah/host/select</Redirect>');
 const next=managed===null?getNextHavdalahSlot(now):managed.find(s=>s.time.getTime()>=now.getTime()-10*60000);
 if(!next)return xml(sayOrPlay(spoken(settings.opening_text+' The next live Havdalah time is not available at the moment. Please try again later.',settings),settings.voice)+'<Hangup/>');
 const minutesUntil=Math.ceil((next.time.getTime()-now.getTime())/60000);
 console.log('HAVDALAH_CALL_BRANCH',{managedSlots:managed?.length??null,nextFound:!!next,minutesUntil,branch:minutesUntil>120?'future':'waiting'});
 if(minutesUntil>120)return xml(sayOrPlay(spoken(settings.opening_text+' The next live Havdalah is '+next.label+', '+time(next.time,next.location?.timezone||TZ)+'. Please call back closer to that time.',settings),settings.voice)+'<Hangup/>');
 const intro=`${settings.opening_text} The next live Havdalah is ${next.label}, ${time(next.time,next.location?.timezone||TZ)}, in approximately ${left(next.time,now)}. ${activeSponsor(settings)} Your call is muted. Nobody on the hotline can hear you. Please stay on the line.`;
 return xml(`${sayOrPlay(spoken(intro,settings),settings.voice)}<Dial><Conference muted="true" participantLabel="listener-${x(form.get('CallSid')||'caller')}" startConferenceOnEnter="false" endConferenceOnExit="false" beep="false" waitUrl="/api/havdalah/wait" waitMethod="POST" statusCallback="/api/havdalah/conference/events" statusCallbackMethod="POST" statusCallbackEvent="start end join leave mute announcement">${x(next.conference)}</Conference></Dial>`);
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
