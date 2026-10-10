import {sayOrPlay} from '../../../../../lib/havdalahGoogleVoice';
import {getVoiceSettings,spoken} from '../../../../../lib/havdalahVoiceSettings';
import {verifyTwilio} from '../../../../../lib/havdalahTwilioAuth';
import {getUpcomingHavdalahSlots} from '../../../../../lib/havdalahSchedule';
import {getManagedSlots,getActiveTestSlot} from '../../../../../lib/havdalahManaged';
export const runtime='nodejs'; export const dynamic='force-dynamic';
function x(v=''){return String(v).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));}
function xml(b){return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${b}</Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});}
function slotFor(n,now=new Date()){return getUpcomingHavdalahSlots(now).find(s=>s.slot===n&&s.time.getTime()>=now.getTime()-10*60000)||null;}
export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 const settings=await getVoiceSettings();const speak=t=>sayOrPlay(spoken(t,settings),settings.voice);
 const form=await request.formData().catch(()=>new FormData()),url=new URL(request.url),slot=Number(url.searchParams.get('slot')),managed=url.searchParams.get('id')?await getManagedSlots(new Date()).catch(()=>null):null,target=managed?.find(s=>s.slotId===url.searchParams.get('id')&&s.time.getTime()>=Date.now()-10*60000)||null;
 if(!url.searchParams.get('id')&&slot!==1)return xml(speak('This host number is assigned to the first session only.')+'<Hangup/>');
 if(target?.hosts&&!target.hosts.some(h=>h.phone===form.get('From')))return xml(speak('This host is not assigned to this session.')+'<Hangup/>');
 if(!target)return xml(speak('That Havdalah slot is no longer available.')+'<Hangup/>');
 const id=target.slotId?'&amp;id='+target.slotId:'';
 if(form.get('Digits')!=='1')return xml(`<Redirect method="POST">/api/havdalah/host/wait?slot=${slot}${id}</Redirect>`);
 
 return xml(`<Dial timeLimit="600"><Conference muted="true" participantLabel="host-primary" startConferenceOnEnter="true" endConferenceOnExit="false" beep="false" waitUrl="/api/havdalah/wait?conference=${encodeURIComponent(target.conference)}" waitMethod="POST" statusCallback="/api/havdalah/conference/events" statusCallbackMethod="POST" statusCallbackEvent="start end join leave mute announcement">${x(target.conference)}</Conference></Dial>`);
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
