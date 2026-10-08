import {createClient} from '@supabase/supabase-js';
import {googleVoices} from './havdalahGoogleVoice';
const defaults={listener_window_minutes:15,callback_window_minutes:60,optional_wait_text:'You can remain on the line or call back closer to the time.',pronunciation_motzei_shabbos:'Motzei Shabbos',pronunciation_motzei_yom_tov:'Motzei Yom Tov',early_call_text:'The next live Havdalah is Motzaei Shabbos, {date} at {time}, in approximately {remaining}. Please call back closer to that time.',listener_intro_text:'The next live Havdalah is Motzaei Shabbos, {date} at {time}, in approximately {remaining}.',host_early_text:'Your Havdalah session is at {time}, in approximately {remaining}. Please call back closer to the time.',host_welcome_text:'Your Havdalah session is at {time}, in approximately {remaining}. You are completely private and nobody can hear you. Please remain on the line.',host_countdown_text:'Your Havdalah slot is in approximately {minutes} minutes. You are completely private and nobody can hear you. Please remain on the line.',host_due_text:'Your Havdalah is due to start now. You are still completely private. Press 1 when you are ready to begin.',opening_text:'Welcome to the Havdalah Hotline, a project of Diamant Solutions.',sponsor_text:'',sponsor_enabled:true,alternate_sponsor_text:'',alternate_sponsor_enabled:false,alternate_sponsor_from:null,alternate_sponsor_until:null,pre_live_text:'Live Havdalah is beginning. Five. Four. Three. Two. One.',closing_text:'Thank you for using the Havdalah Hotline, a free project of Diamant Solutions. Wishing you a good voch.',waiting_text:'Please remain on the line. Your call is muted and nobody can hear you. Live Havdalah will begin shortly.',voice:'en-GB-Chirp3-HD-Callirrhoe',pronunciation_havdalah:'Havdalah',pronunciation_diamant:'Diamant'};
export async function getVoiceSettings(){
 try{
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.DS_SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return defaults;
  const db=createClient(url,key,{auth:{persistSession:false}});
  const {data,error}=await db.from('havdalah_voice_settings').select('*').eq('id','main').maybeSingle();
  if(error||!data)return defaults;
  return {...defaults,...data,voice:[...googleVoices,'Polly.Amy','Polly.Brian','Polly.Emma'].includes(data.voice)?data.voice:defaults.voice};
 }catch{return defaults;}
}
export function spoken(text,settings){
 return String(text);
}

export function activeSponsor(s){const today=new Date().toISOString().slice(0,10);if(s.alternate_sponsor_enabled&&(!s.alternate_sponsor_from||today>=s.alternate_sponsor_from)&&(!s.alternate_sponsor_until||today<=s.alternate_sponsor_until))return s.alternate_sponsor_text||'';return s.sponsor_enabled?s.sponsor_text||'':'';}

export function fillTemplate(template,values){return String(template||'').replace(/\{([a-z_]+)\}/g,(match,key)=>Object.prototype.hasOwnProperty.call(values,key)?String(values[key]):match);}

export function occasionForSlot(slot,settings){const label=String(slot?.occasion||slot?.label||'');return /yom\s*tov|yomtov|chag/i.test(label)?settings.pronunciation_motzei_yom_tov||'Motzei Yom Tov':settings.pronunciation_motzei_shabbos||'Motzei Shabbos';}
