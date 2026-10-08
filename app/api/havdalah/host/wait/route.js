import {verifyTwilio} from '../../../../../lib/havdalahTwilioAuth';
import {getUpcomingHavdalahSlots} from '../../../../../lib/havdalahSchedule';
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
 const now=new Date(),target=slotFor(slot,now);if(!target)return xml('<Say>That Havdalah slot is no longer available.</Say><Hangup/>');
 const due=target.time.getTime()<=now.getTime();
 const gather=due?`<Gather input="dtmf" numDigits="1" timeout="30" action="/api/havdalah/host/start?slot=${slot}" method="POST"><Pause length="30"/></Gather>`:'<Pause length="30"/>';
 return xml(`<Say voice="Polly.Amy">${x(msg(target.time,now))}</Say>${gather}<Redirect method="POST">/api/havdalah/host/wait?slot=${slot}</Redirect>`);
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
