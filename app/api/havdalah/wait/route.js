import {sayOrPlay} from '../../../../lib/havdalahGoogleVoice';
import {getVoiceSettings,spoken,fillTemplate} from '../../../../lib/havdalahVoiceSettings';
import {verifyTwilio} from '../../../../lib/havdalahTwilioAuth';
import {getManagedSlots} from '../../../../lib/havdalahManaged';
import {getNextHavdalahSlot} from '../../../../lib/havdalahSchedule';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function xml(body){return new Response('<?xml version="1.0" encoding="UTF-8"?><Response>'+body+'</Response>',{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});}
export async function POST(request){
 const form=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,form)))return new Response('Forbidden',{status:403});
 const settings=await getVoiceSettings();
 const custom=settings.hold_music_url;
 const music=typeof custom==='string'&&/^https:\/\//.test(custom)&&!/[<>&"']/.test(custom)?custom:'https://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.mp3';
 const url=new URL(request.url);
 const started=Number(url.searchParams.get('started'))||Date.now();
 const now=new Date();
 let next=null;
 try{next=(await getManagedSlots(now,String(form.get('To')||'').replace(/[^+\\d]/g,'')))?.find(s=>s.time.getTime()>=now.getTime()-10*60000);}catch(e){console.error('HAVDALAH_WAIT_SLOTS',e);}
 if(!next)try{next=getNextHavdalahSlot(now);}catch(e){console.error('HAVDALAH_WAIT_FALLBACK',e);}
 const remaining=next?Math.max(0,Math.ceil((next.time.getTime()-now.getTime())/60000)):0;
 const h=Math.floor(remaining/60),m=remaining%60;
 const duration=h?h+' hour'+(h===1?'':'s')+(m?' and '+m+' minute'+(m===1?'':'s'):''):remaining+' minute'+(remaining===1?'':'s');
 const announcement=next&&remaining>0&&url.searchParams.has('started')?sayOrPlay(spoken(fillTemplate('Your live Huvdollar session begins in {remaining}. Please remain on the line.',{remaining:duration}),settings),settings.voice):'';
 const elapsed=Math.max(0,Date.now()-started);
 const seconds=Math.max(1,Math.ceil((120000-elapsed%120000)/1000));
 const safeMusic=music.replace(/&/g,'&amp;');
 return xml(announcement+'<Play loop="1">'+safeMusic+'</Play><Redirect method="POST">/api/havdalah/wait?started='+started+'</Redirect>');
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
