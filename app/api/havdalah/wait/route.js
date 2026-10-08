import {sayOrPlay} from '../../../../lib/havdalahGoogleVoice';
import {getVoiceSettings,spoken} from '../../../../lib/havdalahVoiceSettings';
import {verifyTwilio} from '../../../../lib/havdalahTwilioAuth';
export const dynamic='force-dynamic';
export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 const settings=await getVoiceSettings();const message=spoken(settings.waiting_text,settings);
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${sayOrPlay(message,settings.voice)}<Pause length="45"/><Redirect method="POST">/api/havdalah/wait</Redirect></Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
