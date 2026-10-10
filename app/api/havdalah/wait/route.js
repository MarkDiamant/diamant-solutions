import {getManagedSlots,getActiveTestSlot} from '../../../../lib/havdalahManaged';
import {sayOrPlay} from '../../../../lib/havdalahGoogleVoice';

import {getVoiceSettings,fillTemplate} from '../../../../lib/havdalahVoiceSettings';
import {verifyTwilio} from '../../../../lib/havdalahTwilioAuth';
export const dynamic='force-dynamic';
export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 const settings=await getVoiceSettings();const custom=settings.hold_music_url;const music=typeof custom==='string'&&/^https:\/\//.test(custom)&&!/[<>&"']/.test(custom)?custom:'https://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.mp3';
 const url=new URL(request.url),conference=url.searchParams.get('conference');
 const last=Number(url.searchParams.get('last')??'-1'),tick=Math.max(0,Number(url.searchParams.get('tick'))||0);const started=Number(url.searchParams.get('started'))||Date.now();const initial=Number(url.searchParams.get('initial'))||0;
 let next=null;try{const slots=await getManagedSlots(new Date());next=slots?.find(s=>s.conference===conference)||null;}catch(e){console.error('HAVDALAH_WAIT_MANAGED',e);}
 const remainingMs=next?next.time.getTime()-Date.now():-1;
 const bucket=remainingMs>0?Math.ceil(remainingMs/60000):0;
 const changed=remainingMs>0&&Date.now()-started>=60000&&bucket!==last&&last>=0&&bucket<initial&&bucket<=60;
 const remaining=remainingMs<60000?'less than a minute':Math.ceil(remainingMs/60000)+' minutes';
 const message=changed?sayOrPlay(fillTemplate(settings.waiting_text,{remaining,minutes:Math.ceil(remainingMs/60000)}),settings.voice):'';
 const musicUrl=new URL('/api/havdalah/music/chunk?duration=60&tick='+tick,request.url).toString().replace(/&/g,'&amp;');
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${message}<Play>${musicUrl}</Play><Redirect method="POST">/api/havdalah/wait?conference=${encodeURIComponent(conference||'')}&amp;last=${bucket}&amp;tick=${tick+1}&amp;started=${started}&amp;initial=${initial}</Redirect></Response>`,{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});

}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
