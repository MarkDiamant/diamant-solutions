import {sayOrPlay} from '../../../../lib/havdalahGoogleVoice';
import {getVoiceSettings,spoken,activeSponsor,fillTemplate,occasionForSlot} from '../../../../lib/havdalahVoiceSettings';
import {verifyTwilio} from '../../../../lib/havdalahTwilioAuth';
import {getNextHavdalahSlot} from '../../../../lib/havdalahSchedule';
import {getManagedSlots,getActiveTestSlot} from '../../../../lib/havdalahManaged';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const TZ='Europe/London';

function x(v=''){return String(v).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));}
function time(d,tz=TZ){return new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'numeric',minute:'2-digit',hour12:true}).format(d);}
function date(d,tz=TZ){return new Intl.DateTimeFormat('en-GB',{timeZone:tz,day:'numeric',month:'long'}).format(d);}
function when(t,n,tz=TZ){const key=d=>new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);return key(t)===key(n)?'tonight':'on '+date(t,tz);}
function left(t,n){const m=Math.max(0,Math.floor((t-n)/60000));if(m<60)return `${m} minute${m===1?'':'s'}`;const h=Math.floor(m/60),r=m%60;return r?`${h} hour${h===1?'':'s'} and ${r} minute${r===1?'':'s'}`:`${h} hour${h===1?'':'s'}`;}
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
 const test=await getActiveTestSlot(now,phone(form.get('To'))).catch(e=>{console.error('HAVDALAH_TEST_LOOKUP',e);return null;});
 const managed=await Promise.race([getManagedSlots(now,phone(form.get('To'))).catch(error=>{console.error('HAVDALAH_MANAGED_LOOKUP',error);return null;}),new Promise(resolve=>setTimeout(()=>{console.error('HAVDALAH_MANAGED_LOOKUP_TIMEOUT');resolve(null);},12000))]);
 const activeSlots=test?[test]:managed;
 const assigned=activeSlots?.find(s=>s.hosts.some(h=>phone(h.phone)===phone(form.get('From')))&&s.time.getTime()>=now.getTime()-10*60000);
 if(assigned){
  const early=assigned.time.getTime()-now.getTime()>3600000;
  const vars={day:occasionForSlot(assigned,settings),date:date(assigned.time,assigned.location?.timezone||TZ),time:time(assigned.time,assigned.location?.timezone||TZ),remaining:left(assigned.time,now)};
  return xml(sayOrPlay(spoken(fillTemplate(early?settings.host_early_text:settings.host_welcome_text,vars),settings),settings.voice)+(early?'<Hangup/>':`<Redirect method="POST">/api/havdalah/host/wait?slot=${assigned.slot}&amp;id=${assigned.slotId}</Redirect>`));
 }
 if(host(form.get('From'))) return xml('<Redirect method="POST">/api/havdalah/host/select</Redirect>');
 let next=activeSlots?.find(s=>s.time.getTime()>=now.getTime()-10*60000);
 if(managed===null){console.error('HAVDALAH_MANAGED_UNAVAILABLE_NO_FALLBACK');return xml(sayOrPlay(spoken('The hotline is temporarily unavailable. Please call back shortly.',settings),settings.voice)+'<Hangup/>');}
 console.info('HAVDALAH_NEXT_SLOT',{managedCount:managed?.length??null,found:!!next});
 if(!next)return xml('<Pause length="2"/>'+sayOrPlay(spoken(settings.opening_text+' '+settings.no_more_sessions_text,settings),settings.voice)+'<Hangup/>');
 const minutesUntil=Math.ceil((next.time.getTime()-now.getTime())/60000);const finalWindow=Math.max(1,Number(settings.listener_window_minutes)||15);const optionalWindow=Math.max(finalWindow,Number(settings.callback_window_minutes)||60);
 console.log('HAVDALAH_CALL_BRANCH',{managedSlots:managed?.length??null,nextFound:!!next,minutesUntil,branch:minutesUntil>optionalWindow?'callback':minutesUntil>finalWindow?'optional':'waiting'});
 if(minutesUntil>optionalWindow)return xml('<Pause length="2"/>'+sayOrPlay(spoken(settings.opening_text+' '+fillTemplate(settings.early_call_text,{day:occasionForSlot(next,settings),date:date(next.time,next.location?.timezone||TZ),time:time(next.time,next.location?.timezone||TZ),remaining:left(next.time,now),when:when(next.time,now,next.location?.timezone||TZ),sponsor:activeSponsor(settings)}),settings),settings.voice)+'<Hangup/>');
 const vars={day:occasionForSlot(next,settings),date:date(next.time,next.location?.timezone||TZ),time:time(next.time,next.location?.timezone||TZ),remaining:left(next.time,now),when:when(next.time,now,next.location?.timezone||TZ)};const intro=settings.opening_text+' '+fillTemplate(minutesUntil>finalWindow?settings.optional_wait_text:settings.listener_intro_text,vars);const sponsor=activeSponsor(settings);
 return xml(`<Pause length="2"/>${sayOrPlay(spoken(intro,settings),settings.voice)}${sponsor?sayOrPlay(spoken(sponsor,settings),settings.voice):''}<Dial><Conference muted="true" participantLabel="listener-${x(form.get('CallSid')||'caller')}" startConferenceOnEnter="false" endConferenceOnExit="false" beep="false" waitUrl="/api/havdalah/wait" waitMethod="POST" statusCallback="/api/havdalah/conference/events" statusCallbackMethod="POST" statusCallbackEvent="start end join leave mute announcement">${x(next.conference)}</Conference></Dial>`);
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
