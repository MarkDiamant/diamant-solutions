import {getNextHavdalahSlot} from '../../../../lib/havdalahSchedule';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const TZ='Europe/London';

function xmlEscape(value=''){
  return String(value).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
}

function spokenTime(date){
  return new Intl.DateTimeFormat('en-GB',{timeZone:TZ,weekday:'long',hour:'numeric',minute:'2-digit',hour12:true}).format(date);
}

function countdown(target,now){
  const mins=Math.max(0,Math.ceil((target-now)/60000));
  if(mins<60) return `${mins} minute${mins===1?'':'s'}`;
  const hours=Math.floor(mins/60),rest=mins%60;
  return rest?`${hours} hour${hours===1?'':'s'} and ${rest} minute${rest===1?'':'s'}`:`${hours} hour${hours===1?'':'s'}`;
}

function normalizePhone(value=''){ return String(value).replace(/[^+\d]/g,''); }
function isHost(from=''){
  const allowed=(process.env.HAVDALAH_HOST_NUMBERS||'').split(',').map(normalizePhone).filter(Boolean);
  return allowed.includes(normalizePhone(from));
}
function twiml(body){
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,{status:200,headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});
}

export async function POST(request){
  const form=await request.formData().catch(()=>new FormData());
  if(isHost(form.get('From'))){
    return twiml('<Redirect method="POST">/api/havdalah/host/select</Redirect>');
  }
  const now=new Date();
  const next=getNextHavdalahSlot(now);
  if(!next) return twiml('<Say voice="Polly.Amy">Welcome to the Havdalah Hotline. The next live Havdalah time is not available at the moment. Please try again later.</Say><Hangup/>');
  const intro=`Welcome to the Havdalah Hotline, a project of Diamant Solutions. The next live Havdalah is ${next.label}, ${spokenTime(next.time)}, in approximately ${countdown(next.time,now)}. Your call is muted. Nobody on the hotline can hear you. Please stay on the line. You will be connected automatically when the live Havdalah begins.`;
  return twiml(`<Say voice="Polly.Amy">${xmlEscape(intro)}</Say><Dial><Conference muted="true" startConferenceOnEnter="false" endConferenceOnExit="false" beep="false">${xmlEscape(next.conference)}</Conference></Dial>`);
}

export async function GET(request){ return POST(request); }
