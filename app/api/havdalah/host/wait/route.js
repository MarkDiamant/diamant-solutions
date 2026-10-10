import {sayOrPlay} from '../../../../../lib/havdalahGoogleVoice';
import {getVoiceSettings,spoken,fillTemplate} from '../../../../../lib/havdalahVoiceSettings';
import {verifyTwilio} from '../../../../../lib/havdalahTwilioAuth';
import {getUpcomingHavdalahSlots} from '../../../../../lib/havdalahSchedule';
import {getManagedSlots,getActiveTestSlot} from '../../../../../lib/havdalahManaged';
export const runtime='nodejs'; export const dynamic='force-dynamic';
function x(v=''){return String(v).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));}
function xml(b){return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${b}</Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});}
function slotFor(n,now=new Date()){return getUpcomingHavdalahSlots(now).find(s=>s.slot===n&&s.time.getTime()>=now.getTime()-10*60000)||null;}
function msg(target,now){const sec=Math.ceil((target-now)/1000);if(sec<=0)return 'Havdalah is due to start now. You are still completely private. Press 1 when you are ready to begin.';const m=Math.ceil(sec/60);return `Your Havdalah slot is in approximately ${m} minute${m===1?'':'s'}. You are completely private and nobody can hear you. Please remain on the line.`;}
export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 const url=new URL(request.url),slot=Number(url.searchParams.get('slot')),elapsed=Math.max(0,Number(url.searchParams.get('elapsed'))||0);
 if(![1,2,3].includes(slot))return xml('<Redirect method="POST">/api/havdalah/host/select</Redirect>');
 const settings=await getVoiceSettings();const caller=String(authForm.get('From')||'');const now=new Date();const managed=url.searchParams.get('id')?await getManagedSlots(now).catch(()=>null):null;const target=managed?.find(s=>s.slotId===url.searchParams.get('id')&&s.time.getTime()>=now.getTime()-10*60000)||null;if(!target)return xml(sayOrPlay(spoken('That Havdalah slot is no longer available.',settings),settings.voice)+'<Hangup/>');
 if(target.hosts&&!target.hosts.some(h=>h.phone===caller))return xml(sayOrPlay(spoken('You are not assigned to this session.',settings),settings.voice)+'<Hangup/>');
 const remainingMs=target.time.getTime()-Date.now(),due=remainingMs<=60000,id=target.slotId?'&amp;id='+target.slotId:'';
 const last=Number(url.searchParams.get('last')||-1);
 const bucket=remainingMs>0?Math.ceil(remainingMs/60000):0;
 const announce=!due&&bucket!==last&&bucket<=60;
 const remaining=remainingMs<60000?'less than a minute':Math.ceil(remainingMs/60000)+' minutes';
 const prompt=due?(remainingMs<=0?'Your Havdalah is due to start now. Press 1 to begin.':settings.host_due_text):(announce?fillTemplate(settings.host_countdown_text,{minutes:Math.ceil(remainingMs/60000),remaining}):'');
 const announcement=prompt?sayOrPlay(spoken(prompt,settings),settings.voice):'';
 const tick=Math.max(0,Number(url.searchParams.get('tick'))||0);
 const gather=due?`<Gather input="dtmf" numDigits="1" timeout="10" action="/api/havdalah/host/start?slot=${slot}${id}" method="POST">${announcement}<Pause length="10"/></Gather>`:`<Play>${new URL('/api/havdalah/music/chunk?duration=115&tick='+Math.max(0,Number(url.searchParams.get('tick'))||0),request.url).toString().replace(/&/g,'&amp;')}</Play>`;
 return xml(`${due?'':announcement}${gather}<Redirect method="POST">/api/havdalah/host/wait?slot=${slot}${id}&amp;last=${due?last:bucket}&amp;tick=${tick+1}</Redirect>`);
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
