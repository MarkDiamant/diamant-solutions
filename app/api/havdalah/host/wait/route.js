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
 const remainingMs=target.time.getTime()-now.getTime();const due=remainingMs<=30000;const id=target.slotId?'&amp;id='+target.slotId:'';
 const prompt=due?settings.host_due_text:(elapsed>=60&&elapsed%60<15?fillTemplate(settings.host_countdown_text,{minutes:Math.max(1,Math.ceil(remainingMs/60000)),remaining:Math.max(1,Math.floor(remainingMs/60000))+' minute'+(Math.floor(remainingMs/60000)===1?'':'s')}):'');
 const announcement=prompt?sayOrPlay(spoken(prompt,settings),settings.voice):'';
 const gather=due?`<Gather input="dtmf" numDigits="1" timeout="25" action="/api/havdalah/host/start?slot=${slot}${id}" method="POST"><Pause length="25"/></Gather>`:`<Play>${new URL('/api/havdalah/music/chunk?duration=15&tick='+Math.floor(elapsed/15),request.url).toString().replace(/&/g,'&amp;')}</Play>`;
 return xml(`${announcement}${gather}<Redirect method="POST">/api/havdalah/host/wait?slot=${slot}${id}&amp;elapsed=${elapsed+(due?25:15)}</Redirect>`);
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
