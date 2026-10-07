import {getUpcomingHavdalahSlots} from '../../../../../lib/havdalahSchedule';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function xmlEscape(value=''){ return String(value).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c])); }
function twiml(body){ return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}}); }
function slotFor(number,now=new Date()){ return getUpcomingHavdalahSlots(now).find(s=>s.slot===number && s.time.getTime()>=now.getTime()-30*60000)||null; }

export async function POST(request){
  const form=await request.formData().catch(()=>new FormData());
  const url=new URL(request.url);
  const slot=Number(url.searchParams.get('slot'));
  const target=slotFor(slot,new Date());
  if(!target) return twiml('<Say>That Havdalah slot is no longer available.</Say><Hangup/>');
  if(form.get('Digits')!=='1') return twiml(`<Redirect method="POST">/api/havdalah/host/wait?slot=${slot}</Redirect>`);
  const now=Date.now(),early=target.time.getTime()-now;
  if(early>0){
    const min=Math.max(1,Math.ceil(early/60000));
    return twiml(`<Say voice="Polly.Amy">It is not yet the scheduled time. Approximately ${min} minute${min===1?'':'s'} remaining. You are still private.</Say><Redirect method="POST">/api/havdalah/host/wait?slot=${slot}</Redirect>`);
  }
  return twiml(`<Say voice="Polly.Amy">Your call is now going live. You are the only speaker.</Say><Dial><Conference muted="false" startConferenceOnEnter="true" endConferenceOnExit="true" beep="false">${xmlEscape(target.conference)}</Conference></Dial>`);
}
export async function GET(request){ return POST(request); }
