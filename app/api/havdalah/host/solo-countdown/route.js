import {verifyTwilio} from '../../../../../lib/havdalahTwilioAuth';
import {getVoiceSettings,spoken} from '../../../../../lib/havdalahVoiceSettings';
import {sayOrPlay} from '../../../../../lib/havdalahGoogleVoice';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function escapeXml(s){return String(s).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));}
export async function POST(request){
 const form=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,form)))return new Response('Forbidden',{status:403});
 const conference=new URL(request.url).searchParams.get('conference')||'';
 if(!/^havdalah-(?:test-)?[a-zA-Z0-9_-]{8,110}$/.test(conference))return new Response('Invalid conference',{status:400});
 const settings=await getVoiceSettings();
 const countdown=sayOrPlay(spoken(settings.pre_live_text||'Live Havdalah is beginning. Five. Four. Three. Two. One.',settings),settings.voice);
 const body='<?xml version="1.0" encoding="UTF-8"?><Response>'+countdown+'<Dial timeLimit="600"><Conference muted="false" participantLabel="host-live" startConferenceOnEnter="true" endConferenceOnExit="false" beep="false" statusCallback="/api/havdalah/conference/events" statusCallbackMethod="POST" statusCallbackEvent="start end join leave mute announcement">'+escapeXml(conference)+'</Conference></Dial></Response>';
 return new Response(body,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
