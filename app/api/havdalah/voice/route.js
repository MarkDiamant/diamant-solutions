import {getNextHavdalahSlot} from '../../../../lib/havdalahSchedule';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const TZ='Europe/London';

function xmlEscape(value=''){
  return String(value).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
}

function spokenTime(date){
  return new Intl.DateTimeFormat('en-GB',{
    timeZone:TZ,
    weekday:'long',
    hour:'numeric',
    minute:'2-digit',
    hour12:true,
  }).format(date);
}

function countdown(target,now){
  const mins=Math.max(0,Math.ceil((target-now)/60000));
  if(mins<60) return `${mins} minute${mins===1?'':'s'}`;
  const hours=Math.floor(mins/60),rest=mins%60;
  return rest?`${hours} hour${hours===1?'':'s'} and ${rest} minute${rest===1?'':'s'}`:`${hours} hour${hours===1?'':'s'}`;
}

function twiml(body){
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,{
    status:200,
    headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'},
  });
}

export async function POST(){
  const now=new Date();
  const next=getNextHavdalahSlot(now);
  if(!next){
    return twiml('<Say voice="Polly.Amy">Welcome to the Havdalah Hotline. The next live Havdalah time is not available at the moment. Please try again later.</Say><Hangup/>');
  }
  const until=countdown(next.time,now);
  const when=spokenTime(next.time);
  const intro=`Welcome to the Havdalah Hotline, a project of Diamant Solutions. The next live Havdalah is ${next.label}, ${when}, in approximately ${until}. Please stay on the line. You will be connected automatically when the live Havdalah begins.`;
  return twiml(
    `<Say voice="Polly.Amy">${xmlEscape(intro)}</Say>`+
    '<Dial answerOnBridge="true">'+
      `<Conference muted="true" startConferenceOnEnter="false" endConferenceOnExit="false" beep="false">${xmlEscape(next.conference)}</Conference>`+
    '</Dial>'
  );
}

export async function GET(){
  return POST();
}
