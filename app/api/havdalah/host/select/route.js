import {getUpcomingHavdalahSlots} from '../../../../../lib/havdalahSchedule';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function xmlEscape(value=''){ return String(value).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c])); }
function twiml(body){ return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}}); }
function slotFor(number,now=new Date()){ return getUpcomingHavdalahSlots(now).find(s=>s.slot===number && s.time.getTime()>=now.getTime()-30*60000)||null; }

export async function POST(){
  const now=new Date();
  const slots=[1,2,3].map(n=>slotFor(n,now));
  if(slots.some(s=>!s)) return twiml('<Say>Host schedule is temporarily unavailable.</Say><Hangup/>');
  const choices=slots.map((s,i)=>`Press ${i+1} for the ${i===0?'first':i===1?'second':'third'} live Havdalah slot.`).join(' ');
  return twiml(`<Say voice="Polly.Amy">Host line. You are not live and callers cannot hear you. ${xmlEscape(choices)}</Say><Gather input="dtmf" numDigits="1" timeout="10" action="/api/havdalah/host/wait" method="POST"/><Redirect method="POST">/api/havdalah/host/select</Redirect>`);
}
export async function GET(){ return POST(); }
