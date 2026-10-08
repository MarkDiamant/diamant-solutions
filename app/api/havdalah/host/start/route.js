import {getUpcomingHavdalahSlots} from '../../../../../lib/havdalahSchedule';
export const runtime='nodejs'; export const dynamic='force-dynamic';
function x(v=''){return String(v).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));}
function xml(b){return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${b}</Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});}
function slotFor(n,now=new Date()){return getUpcomingHavdalahSlots(now).find(s=>s.slot===n&&s.time.getTime()>=now.getTime()-10*60000)||null;}
export async function POST(request){
 const form=await request.formData().catch(()=>new FormData()),url=new URL(request.url),slot=Number(url.searchParams.get('slot')),target=slotFor(slot,new Date());
 if(slot!==1)return xml('<Say>This host number is assigned to the first session only.</Say><Hangup/>');
 if(!target)return xml('<Say>That Havdalah slot is no longer available.</Say><Hangup/>');
 if(form.get('Digits')!=='1')return xml(`<Redirect method="POST">/api/havdalah/host/wait?slot=${slot}</Redirect>`);
 if(target.time.getTime()>Date.now())return xml(`<Say voice="Polly.Amy">It is not yet the scheduled time. You remain private.</Say><Redirect method="POST">/api/havdalah/host/wait?slot=${slot}</Redirect>`);
 return xml(`<Say voice="Polly.Amy">Ready. You will remain muted until the shared starting announcement has finished.</Say><Dial><Conference muted="true" participantLabel="host-primary" startConferenceOnEnter="true" endConferenceOnExit="false" beep="false" statusCallback="/api/havdalah/conference/events" statusCallbackMethod="POST" statusCallbackEvent="start end join leave mute announcement">${x(target.conference)}</Conference></Dial>`);
}
export async function GET(r){return POST(r);}
