import {getVoiceSettings} from '../../../../../lib/havdalahVoiceSettings';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
function header(b,p){
 if(p+4>b.length||b[p]!==255||(b[p+1]&224)!==224)return null;
 const version=(b[p+1]>>3)&3,layer=(b[p+1]>>1)&3;
 const bitrateTable=version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
 const index=(b[p+2]>>4)&15;
 const srIndex=(b[p+2]>>2)&3;
 const srBase=[44100,48000,32000][srIndex];
 if(version===1||layer!==1||index===0||index===15||srIndex===3)return null;
 const sr=srBase/(version===3?1:version===2?2:4);
 const samples=version===3?1152:576;
 const len=Math.floor((version===3?144:72)*bitrateTable[index]*1000/sr)+((b[p+2]>>1)&1);
 return len>4&&p+len<=b.length?{len,seconds:samples/sr}:null;
}
export async function GET(request){
 const settings=await getVoiceSettings();
 const custom=settings.hold_music_url;
 const music=typeof custom==='string'&&/^https:\/\//.test(custom)&&!/[<>&"']/.test(custom)?custom:'https://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.mp3';
 const allowed=[new URL(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://invalid.example').hostname,'com.twilio.music.classical.s3.amazonaws.com'];
 if(!allowed.includes(new URL(music).hostname))return new Response('Invalid music host',{status:400});
 const res=await fetch(music,{signal:AbortSignal.timeout(18000)});
 if(!res.ok)return new Response('Music unavailable',{status:502});
 const b=new Uint8Array(await res.arrayBuffer());
 if(b.length>52428800)return new Response('Music too large',{status:413});
 let pos=0;
 if(b[0]===73&&b[1]===68&&b[2]===51)pos=10+((b[6]&127)<<21)+((b[7]&127)<<14)+((b[8]&127)<<7)+(b[9]&127);
 while(pos+4<b.length&&!header(b,pos))pos++;
 const frames=[];let seconds=0;
 while(pos+4<b.length){const h=header(b,pos);if(!h)break;frames.push({pos,len:h.len,t:seconds});seconds+=h.seconds;pos+=h.len;}
 if(!frames.length)return new Response('Unsupported MP3',{status:422});
 const tick=Math.max(0,Math.floor(Number(new URL(request.url).searchParams.get('tick'))||0));
 const duration=115;
 const offset=seconds>duration?tick*duration%seconds:0;
 let start=frames.findIndex(f=>f.t>=offset);
 if(start<0)start=0;
 let end=start;
 while(end<frames.length&&frames[end].t-frames[start].t<duration)end++;
 if(end===start)end++;
 const startByte=frames[start].pos,endByte=frames[end-1].pos+frames[end-1].len;
 return new Response(b.slice(startByte,endByte),{headers:{'Content-Type':'audio/mpeg','Cache-Control':'public, max-age=60'}});
}
