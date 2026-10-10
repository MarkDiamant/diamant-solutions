import {getManagedSlots,getActiveTestSlot} from '../../../../lib/havdalahManaged';
import {sayOrPlay} from '../../../../lib/havdalahGoogleVoice';

import {getVoiceSettings,fillTemplate} from '../../../../lib/havdalahVoiceSettings';
import {verifyTwilio} from '../../../../lib/havdalahTwilioAuth';
export const dynamic='force-dynamic';
export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 const settings=await getVoiceSettings();const custom=settings.hold_music_url;const music=typeof custom==='string'&&/^https:\/\//.test(custom)&&!/[<>&"']/.test(custom)?custom:'https://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.mp3';
 const url=new URL(request.url);const tick=Math.max(0,Number(url.searchParams.get('tick'))||0);const conference=url.searchParams.get('conference');let next=null;try{const slots=await getManagedSlots(new Date());next=slots?.find(s=>s.conference===conference)||null;}catch(e){console.error('HAVDALAH_WAIT_MANAGED',e);} const mins=next?Math.max(0,Math.floor((next.time.getTime()-Date.now())/60000)):0; const message=tick&&next&&next.time.getTime()>Date.now()&&mins<=60&&tick%1===0?sayOrPlay(fillTemplate(settings.waiting_text,{remaining:mins<1?'less than a minute':mins+' minute'+(mins===1?'':'s'),minutes:mins<1?'less than a minute':mins}),settings.voice):'';
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${message}<Play>${new URL("/api/havdalah/music/chunk?duration=60&tick="+tick,request.url).toString().replace(/&/g,"&amp;")}</Play><Redirect method="POST">/api/havdalah/wait?conference=${encodeURIComponent(conference||"")}&amp;tick=${tick+1}</Redirect></Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
