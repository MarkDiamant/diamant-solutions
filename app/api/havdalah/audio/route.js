import {validateAudio,isGoogleVoice} from '../../../../lib/havdalahGoogleVoice';
import {inflateRawSync} from 'node:zlib';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 const url=new URL(request.url),data=url.searchParams.get('d'),expires=url.searchParams.get('e'),sig=url.searchParams.get('s');
 console.log('HAVDALAH_AUDIO_REQUEST',{dataLength:data?.length||0,valid:validateAudio(data,expires,sig)});
 if(!validateAudio(data,expires,sig))return new Response('Forbidden',{status:403});
 let item;try{item=JSON.parse(inflateRawSync(Buffer.from(data,'base64url')).toString('utf8'))}catch{return new Response('Bad request',{status:400})}
 if(!isGoogleVoice(item.voice)||typeof item.text!=='string'||item.text.length>4500)return new Response('Bad request',{status:400});
 const key=process.env.GOOGLE_TTS_API_KEY;
 if(!key)return new Response('Voice service not configured',{status:503});
 try{
  const response=await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:{text:item.text},voice:{languageCode:'en-GB',name:item.voice},audioConfig:{audioEncoding:'MP3',speakingRate:1}}),signal:AbortSignal.timeout(15000)});
  if(!response.ok){console.error('HAVDALAH_GOOGLE_TTS',response.status,(await response.text()).slice(0,300));return new Response('Voice generation unavailable',{status:502})}
  const result=await response.json();
  if(!result.audioContent)return new Response('Voice generation unavailable',{status:502});
  return new Response(Buffer.from(result.audioContent,'base64'),{headers:{'Content-Type':'audio/mpeg','Cache-Control':'public, max-age=3600, s-maxage=3600','X-Content-Type-Options':'nosniff'}});
 }catch(e){console.error('HAVDALAH_GOOGLE_TTS',e);return new Response('Voice generation unavailable',{status:502})}
}
