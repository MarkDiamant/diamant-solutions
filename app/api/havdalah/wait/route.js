import {sayOrPlay} from '../../../../lib/havdalahGoogleVoice';
import {getNextHavdalahSlot} from '../../../../lib/havdalahSchedule';
import {getVoiceSettings} from '../../../../lib/havdalahVoiceSettings';
import {verifyTwilio} from '../../../../lib/havdalahTwilioAuth';
export const dynamic='force-dynamic';
export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 const settings=await getVoiceSettings();const custom=settings.hold_music_url;const music=typeof custom==='string'&&/^https:\/\//.test(custom)&&!/[<>&"']/.test(custom)?custom:'https://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.mp3';
 const tick=Math.max(0,Number(new URL(request.url).searchParams.get('tick'))||0); let next=null;try{next=getNextHavdalahSlot(new Date());}catch(e){console.error('HAVDALAH_WAIT_SCHEDULE',e);} const mins=next?Math.max(0,Math.ceil((next.time-Date.now())/60000)):0; const message=tick&&mins?sayOrPlay('Your live Huvdollar session begins in '+mins+' minutes. Please remain on the line.',settings.voice):'';
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${message}<Play>${new URL("/api/havdalah/music/chunk?tick="+tick,request.url).toString().replace(/&/g,"&amp;")}</Play><Redirect method="POST">/api/havdalah/wait?tick=${tick+1}</Redirect></Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
