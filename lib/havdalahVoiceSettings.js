import {createClient} from '@supabase/supabase-js';
const defaults={opening_text:'Welcome to the Havdalah Hotline, a project of Diamant Solutions.',sponsor_text:'',waiting_text:'Please remain on the line. Your call is muted and nobody can hear you. Live Havdalah will begin shortly.',voice:'Polly.Amy',pronunciation_havdalah:'Havdalah',pronunciation_diamant:'Diamant'};
export async function getVoiceSettings(){
 try{
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.DS_SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return defaults;
  const db=createClient(url,key,{auth:{persistSession:false}});
  const {data,error}=await db.from('havdalah_voice_settings').select('*').eq('id','main').maybeSingle();
  if(error||!data)return defaults;
  return {...defaults,...data,voice:['Polly.Amy','Polly.Brian','Polly.Emma'].includes(data.voice)?data.voice:defaults.voice};
 }catch{return defaults;}
}
export function spoken(text,settings){
 return String(text).replace(/\bHavdalah\b/gi,settings.pronunciation_havdalah||'Havdalah').replace(/\bDiamant\b/gi,settings.pronunciation_diamant||'Diamant');
}
