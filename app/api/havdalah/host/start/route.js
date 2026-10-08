import {verifyTwilio} from '../../../../../lib/havdalahTwilioAuth';
import {getUpcomingHavdalahSlots} from '../../../../../lib/havdalahSchedule';
import {getManagedSlots} from '../../../../../lib/havdalahManaged';
export const runtime='nodejs'; export const dynamic='force-dynamic';
function x(v=''){return String(v).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));}
function xml(b){return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${b}</Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});}
function slotFor(n,now=new Date()){return getUpcomingHavdalahSlots(now).find(s=>s.slot===n&&s.time.getTime()>=now.getTime()-10*60000)||null;}
export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 const form=await request.formData().catch(()=>new FormData()),url=new URL(request.url),slot=Number(url.searchParams.get('slot')),managed=url.searchParams.get('id')?await getManagedSlots(new Date()).catch(()=>null):null,target=managed?.find(s=>s.slotId===url.searchParams.get('id')&&s.time.getTime()>=Date.now()-10*60000)||(!url.searchParams.get('id')?slotFor(slot,new Date()):null);
 if(!url.searchParams.get('id')&&slot!==1)return xml('<Say>This host number is assigned to the first session only.</Say><Hangup/>');
 if(target?.hosts&&!target.hosts.some(h=>h.phone===form.get('From')))return xml('<Say>This host is not assigned to this session.</Say><Hangup/>');
 if(!target)return xml('<Say>That Havdalah slot is no longer available.</Say><Hangup/>');
 const id=target.slotId?'&amp;id='+target.slotId:'';
 if(form.get('Digits')!=='1')return xml(`<Redirect method="POST">/api/havdalah/host/wait?slot=${slot}${id}</Redirect>`);
 if(target.time.getTime()>Date.now())return xml(`<Say voice="Polly.Amy">It is not yet the scheduled time. You remain private.</Say><Redirect method="POST">/api/havdalah/host/wait?slot=${slot}${id}</Redirect>`);
 return xml(`<Say voice="Polly.Amy">Ready. You will remain muted until the shared starting announcement has finished.</Say><Dial><Conference muted="true" participantLabel="host-primary" startConferenceOnEnter="true" endConferenceOnExit="false" beep="false" statusCallback="/api/havdalah/conference/events" statusCallbackMethod="POST" statusCallbackEvent="start end join leave mute announcement">${x(target.conference)}</Conference></Dial>`);
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
