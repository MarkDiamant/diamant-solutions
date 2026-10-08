import crypto from 'node:crypto';
import {deflateRawSync} from 'node:zlib';
const VOICES=['en-GB-Chirp3-HD-Callirrhoe','en-GB-Chirp3-HD-Algenib','en-GB-Chirp3-HD-Leda','en-GB-Chirp3-HD-Sadaltager'];
export const isGoogleVoice=voice=>VOICES.includes(voice);
export const googleVoices=VOICES;
const secret=()=>process.env.TWILIO_AUTH_TOKEN||'';
const signature=(payload)=>crypto.createHmac('sha256',secret()).update(payload).digest('hex');
export function audioUrl(text,voice){
 if(!isGoogleVoice(voice))return null;
 if(!process.env.GOOGLE_TTS_API_KEY||!secret()){console.error('HAVDALAH_GOOGLE_VOICE_CONFIG_MISSING',{keyPresent:!!process.env.GOOGLE_TTS_API_KEY,signingTokenPresent:!!secret()});return null;}
 const data=deflateRawSync(Buffer.from(JSON.stringify({text:String(text).slice(0,4500),voice}))).toString('base64url');
 const expires=Math.floor(Date.now()/1000)+3600;
 const payload=data+'.'+expires;
 return 'https://diamantsolutions.co.uk/api/havdalah/audio?d='+encodeURIComponent(data)+'&e='+expires+'&s='+signature(payload);
}
export function validateAudio(data,expires,sig){
 if(!secret()||!data||!sig||!/^\d+$/.test(String(expires))||Math.abs(Date.now()/1000-Number(expires))>3600)return false;
 const a=Buffer.from(String(sig)),b=Buffer.from(signature(data+'.'+expires));
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
export function sayOrPlay(text,voice){
 const url=audioUrl(text,voice);
 if(url){console.info('HAVDALAH_GOOGLE_PLAY_PREPARED',{voice,characters:String(text).length,urlCharacters:url.length});return '<Play>'+url.replace(/&/g,'&amp;')+'</Play>'; }
 if(isGoogleVoice(voice))console.error('HAVDALAH_GOOGLE_VOICE_FALLBACK',{voice});
 const safe=String(text).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
 return '<Say voice="'+(isGoogleVoice(voice)?'Polly.Emma':voice)+'">'+safe+'</Say>';
}
