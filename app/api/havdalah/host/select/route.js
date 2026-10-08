import {verifyTwilio} from '../../../../../lib/havdalahTwilioAuth';
import {getUpcomingHavdalahSlots} from '../../../../../lib/havdalahSchedule';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function twiml(body){ return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}}); }

export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
  const now=new Date();
  const next=getUpcomingHavdalahSlots(now).find(s=>s.slot===1&&s.time.getTime()>=now.getTime()-10*60000);
  if(!next) return twiml('<Say>Host schedule is temporarily unavailable.</Say><Hangup/>');
  return twiml(`<Say voice="Polly.Amy">Host line. The system has assigned you to the first live Havdalah. You are completely private. Callers cannot hear you.</Say><Redirect method="POST">/api/havdalah/host/wait?slot=${next.slot}</Redirect>`);
}
export async function GET(){ return POST(); }
