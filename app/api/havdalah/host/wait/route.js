import {sayOrPlay} from '../../../../../lib/havdalahGoogleVoice';
import {getVoiceSettings,spoken} from '../../../../../lib/havdalahVoiceSettings';
import {verifyTwilio} from '../../../../../lib/havdalahTwilioAuth';
import {getUpcomingHavdalahSlots} from '../../../../../lib/havdalahSchedule';
import {getManagedSlots} from '../../../../../lib/havdalahManaged';
export const runtime='nodejs'; export const dynamic='force-dynamic';
function x(v=''){return String(v).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));}
function xml(b){return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${b}</Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});}
function slotFor(n,now=new Date()){return getUpcomingHavdalahSlots(now).find(s=>s.slot===n&&s.time.getTime()>=now.getTime()-10*60000)||null;}
function msg(target,now){const sec=Math.ceil((target-now)/1000);if(sec<=0)return 'Havdalah is due to start now. You are still completely private. Press 1 when you are ready to begin.';const m=Math.ceil(sec/60);return `Your Havdalah slot is in approximately ${m} minute${m===1?'':'s'}. You are completely private and nobody can hear you. Please remain on the line.`;}
export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 const url=new URL(request.url),slot=Number(url.searchParams.get('slot'));
 if(![1,2,3].includes(slot))return xml('<Redirect method="POST">/api/havdalah/host/select</Redirect>');
 const settings=await getVoiceSettings();const caller=String(authForm.get('From')||'');const now=new Date();const managed=url.searchParams.get('id')?await getManagedSlots(now).catch(()=>null):null;const target=managed?.find(s=>s.slotId===url.searchParams.get('id')&&s.time.getTime()>=now.getTime()-10*60000)||(!url.searchParams.get('id')?slotFor(slot,now):null);if(!target)return xml(sayOrPlay(spoken('That Havdalah slot is no longer available.',settings),settings.voice)+'<Hangup/>');
 if(target.hosts&&!target.hosts.some(h=>h.phone===caller))return xml(sayOrPlay(spoken('You are not assigned to this session.',settings),settings.voice)+'<Hangup/>');
 const due=target.time.getTime()<=now.getTime();const id=target.slotId?'&amp;id='+target.slotId:'';
 const gather=due?`<Gather input="dtmf" numDigits="1" timeout="30" action="/api/havdalah/host/start?slot=${slot}${id}" method="POST"><Pause length="30"/></Gather>`:'<Pause length="30"/>';
 return xml(`${sayOrPlay(spoken(msg(target.time,now),settings),settings.voice)}${gather}<Redirect method="POST">/api/havdalah/host/wait?slot=${slot}${id}</Redirect>`);
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
