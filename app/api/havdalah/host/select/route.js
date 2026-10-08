import {verifyTwilio} from '../../../../../lib/havdalahTwilioAuth';
import {getManagedSlots} from '../../../../../lib/havdalahManaged';
import {getUpcomingHavdalahSlots} from '../../../../../lib/havdalahSchedule';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function xml(body){return new Response('<?xml version="1.0" encoding="UTF-8"?><Response>'+body+'</Response>',{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});}
function phone(v){return String(v||'').replace(/[^+\\d]/g,'');}
export async function POST(request){
 const form=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,form)))return new Response('Forbidden',{status:403});
 const now=new Date(),caller=phone(form.get('From'));
 const managed=await getManagedSlots(now).catch(()=>null);
 if(managed){
  const next=managed.find(s=>s.time.getTime()>=now.getTime()-10*60000&&s.hosts.some(h=>phone(h.phone)===caller));
  if(!next)return xml('<Say>You are not assigned to an upcoming Havdalah session.</Say><Hangup/>');
  return xml('<Say voice="Polly.Amy">Host line. You are private until you start your session.</Say><Redirect method="POST">/api/havdalah/host/wait?slot='+next.slot+'&amp;id='+next.slotId+'</Redirect>');
 }
 const next=getUpcomingHavdalahSlots(now).find(s=>s.slot===1&&s.time.getTime()>=now.getTime()-10*60000);
 if(!next)return xml('<Say>Host schedule is temporarily unavailable.</Say><Hangup/>');
 return xml('<Say voice="Polly.Amy">Host line. You are completely private.</Say><Redirect method="POST">/api/havdalah/host/wait?slot='+next.slot+'</Redirect>');
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
