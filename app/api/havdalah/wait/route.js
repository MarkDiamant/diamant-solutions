import {sayOrPlay} from '../../../../lib/havdalahGoogleVoice';
import {getVoiceSettings,spoken} from '../../../../lib/havdalahVoiceSettings';
import {verifyTwilio} from '../../../../lib/havdalahTwilioAuth';
export const dynamic='force-dynamic';
export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 const settings=await getVoiceSettings();const message=spoken(settings.waiting_text,settings);const custom=settings.hold_music_url;const music=typeof custom==='string'&&/^https:\/\//.test(custom)&&!/[<>&"']/.test(custom)?custom:'https://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.mp3';
 const first=!new URL(request.url).searchParams.has('loop');
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${first?sayOrPlay(message,settings.voice):''}<Play>${music.replace(/&/g,'&amp;')}</Play><Redirect method="POST">/api/havdalah/wait?loop=1</Redirect></Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
