import {getUpcomingHavdalahSlots} from '../../../../../lib/havdalahSchedule';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function xmlEscape(value=''){ return String(value).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c])); }
function twiml(body){ return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}}); }
function slotFor(number,now=new Date()){ return getUpcomingHavdalahSlots(now).find(s=>s.slot===number && s.time.getTime()>=now.getTime()-30*60000)||null; }

function remaining(target,now){
  const sec=Math.ceil((target-now)/1000);
  if(sec<=0) return 'Your scheduled time has arrived. Press 1 when you are ready to go live.';
  const min=Math.ceil(sec/60);
  return `Your scheduled Havdalah time is in approximately ${min} minute${min===1?'':'s'}. You are still private and muted. Press 1 when you are ready. If it is not yet time, you will remain private.`;
}
export async function POST(request){
  const form=await request.formData().catch(()=>new FormData());
  const url=new URL(request.url);
  const slot=Number(url.searchParams.get('slot')||form.get('slot')||form.get('Digits'));
  if(![1,2,3].includes(slot)) return twiml('<Redirect method="POST">/api/havdalah/host/select</Redirect>');
  const now=new Date(),target=slotFor(slot,now);
  if(!target) return twiml('<Say>That Havdalah slot is no longer available.</Say><Redirect method="POST">/api/havdalah/host/select</Redirect>');
  return twiml(`<Say voice="Polly.Amy">${xmlEscape(remaining(target.time,now))}</Say><Gather input="dtmf" numDigits="1" timeout="45" action="/api/havdalah/host/start?slot=${slot}" method="POST"><Pause length="45"/></Gather><Redirect method="POST">/api/havdalah/host/wait?slot=${slot}</Redirect>`);
}
export async function GET(request){ return POST(request); }
