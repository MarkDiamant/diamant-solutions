import {sayOrPlay} from '../../../../lib/havdalahGoogleVoice';
import {verifyTwilio} from '../../../../lib/havdalahTwilioAuth';
import {getVoiceSettings,spoken} from '../../../../lib/havdalahVoiceSettings';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req){
 const form=await req.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(req,form)))return new Response('Forbidden',{status:403});
 const s=await getVoiceSettings();
 const words=spoken(s.closing_text,s).replace(/[<>&'"]/g,ch=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[ch]));
 return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="'+s.voice+'">'+words+'</Say><Hangup/></Response>',{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
