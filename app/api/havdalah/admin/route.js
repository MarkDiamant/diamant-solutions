import {getManagedSlots} from '../../../../lib/havdalahManaged';
import {getNextHavdalahSlot} from '../../../../lib/havdalahSchedule';
import {occasionForSlot} from '../../../../lib/havdalahVoiceSettings';
import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const tableNames=['havdalah_locations','havdalah_lines','havdalah_hosts','havdalah_slots','havdalah_assignments','havdalah_exceptions','havdalah_host_absences','havdalah_audit','havdalah_voice_settings'];
async function access(req){
 const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
 if(!token)return null;
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.DS_SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!service)return {error:'Admin server configuration is incomplete',status:503};
 const publicClient=createClient(url,anon);
 const {data:{user},error}=await publicClient.auth.getUser(token);
 if(error||!user)return {error:'Your login session has expired. Please sign out and sign in again.',status:401};
 const db=createClient(url,service,{auth:{persistSession:false}});
 const {data:admin,error:dbError}=await db.from('internal_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(dbError)return {error:'Admin database connection failed: '+dbError.message,status:503};
 return admin?{db,user}:{error:'This account is not registered as a hotline administrator.',status:403};
}
export async function GET(req){
 const a=await access(req);if(!a||a.error)return Response.json({error:a?.error||'Unauthorized'},{status:a?.status||401});
 const result={};
 for(const name of tableNames){
  const {data,error}=await a.db.from(name).select('*').limit(500);
  if(error)return Response.json({error:error.message},{status:500});
  result[name]=data;
 }
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
}

const editable={
 havdalah_voice_settings:['listener_window_minutes','callback_window_minutes','optional_wait_text','early_call_text','listener_intro_text','host_early_text','host_welcome_text','host_countdown_text','host_due_text','opening_text','sponsor_text','waiting_text','pre_live_text','closing_text','host_ready_text','hold_music_url','sponsor_enabled','alternate_sponsor_text','alternate_sponsor_enabled','alternate_sponsor_from','alternate_sponsor_until','voice','pronunciation_havdalah','pronunciation_diamant','pronunciation_motzei_shabbos','pronunciation_motzei_yom_tov'],
 havdalah_locations:['name','country_code','timezone','latitude','longitude','havdalah_degrees','enabled'],
 havdalah_lines:['number','location_id','enabled'],
 havdalah_hosts:['name','phone','enabled'],
 havdalah_slots:['location_id','label','offset_minutes','enabled','sort_order'],
 havdalah_assignments:['slot_id','host_id','priority'],
 havdalah_exceptions:['slot_id','session_date','disabled','notes'],
 havdalah_host_absences:['host_id','session_date','reason']
};
export async function POST(req){
 const a=await access(req);if(!a||a.error)return Response.json({error:a?.error||'Unauthorized'},{status:a?.status||401});
 const body=await req.json().catch(()=>null);
 if(body?.action==='preview_context'){
  const now=new Date();
  let slots=null;
  try{slots=await getManagedSlots(now);}catch(e){console.error('HAVDALAH_PREVIEW_SLOTS',e);}
  let next=slots?.find(s=>s.time.getTime()>=now.getTime()-600000);
  if(!next)try{next=getNextHavdalahSlot(now);}catch(e){console.error('HAVDALAH_PREVIEW_FALLBACK',e);}
  if(!next)return Response.json({error:'No upcoming Havdalah session is available'},{status:404});
  const tz=next.location?.timezone||'Europe/London';
  const fmt=(options)=>new Intl.DateTimeFormat('en-GB',{timeZone:tz,...options}).format(next.time);
  const minutes=Math.max(0,Math.ceil((next.time-now)/60000));
  const remaining=minutes<60?minutes+' minute'+(minutes===1?'':'s'):Math.floor(minutes/60)+' hour'+(Math.floor(minutes/60)===1?'':'s')+(minutes%60?' and '+minutes%60+' minute'+(minutes%60===1?'':'s'):'');
  return Response.json({date:fmt({day:'numeric',month:'long'}),time:fmt({hour:'numeric',minute:'2-digit',hour12:true}),remaining,minutes:String(minutes),day:occasionForSlot(next,{})},{headers:{'Cache-Control':'no-store'}});
 }
 if(body?.action==='preview_voice'&&typeof body.text==='string'&&/\\{(date|time|remaining|minutes|when|day)\\}/.test(body.text)){
  const now=new Date();
  let slots=null;
  try{slots=await getManagedSlots(now);}catch(e){console.error('HAVDALAH_PREVIEW_SLOTS',e);}
  let next=slots?.find(s=>s.time.getTime()>=now.getTime()-600000);
  if(!next)try{next=getNextHavdalahSlot(now);}catch(e){console.error('HAVDALAH_PREVIEW_FALLBACK',e);}
  if(!next)return Response.json({error:'No upcoming Havdalah session available'},{status:404});
  const tz=next.location?.timezone||'Europe/London';
  const fmt=options=>new Intl.DateTimeFormat('en-GB',{timeZone:tz,...options}).format(next.time);
  const key=d=>new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const m=Math.max(0,Math.ceil((next.time-now)/60000)),h=Math.floor(m/60),rem=m%60;
  const remaining=h?h+' hour'+(h===1?'':'s')+(rem?' and '+rem+' minute'+(rem===1?'':'s'):''):m+' minute'+(m===1?'':'s');
  const date=fmt({day:'numeric',month:'long'}),time=fmt({hour:'numeric',minute:'2-digit',hour12:true});
  const vars={date,time,remaining,minutes:String(m),day:occasionForSlot(next,{}),when:key(next.time)===key(now)?'tonight':'on '+date};
  body.text=body.text.replace(/\\{(date|time|remaining|minutes|when|day)\\}/g,(_,name)=>String(vars[name]));
 }
 if(body?.action==='preview_voice'){
  const allowed=['en-GB-Chirp3-HD-Callirrhoe','en-GB-Chirp3-HD-Algenib','en-GB-Chirp3-HD-Leda','en-GB-Chirp3-HD-Sadaltager'];
  if(!allowed.includes(body.voice)||typeof body.text!=='string'||!body.text.trim()||body.text.length>4500)return Response.json({error:'Invalid voice or text'},{status:400});
  if(!process.env.GOOGLE_TTS_API_KEY)return Response.json({error:'Google voice API key is not configured'},{status:503});
  try{
   const google=await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key='+encodeURIComponent(process.env.GOOGLE_TTS_API_KEY),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:{text:body.text},voice:{languageCode:'en-GB',name:body.voice},audioConfig:{audioEncoding:'MP3'}}),signal:AbortSignal.timeout(15000)});
   if(!google.ok){console.error('HAVDALAH_PREVIEW_GOOGLE_TTS',google.status,(await google.text()).slice(0,350));return Response.json({error:'Google voice request failed (HTTP '+google.status+')'},{status:502})}
   const result=await google.json();
   return new Response(Buffer.from(result.audioContent,'base64'),{headers:{'Content-Type':'audio/mpeg','Cache-Control':'no-store'}});
  }catch(e){console.error('HAVDALAH_PREVIEW_GOOGLE_TTS',e);return Response.json({error:'Google voice preview failed'},{status:502})}
 }

 const table=body?.table,action=body?.action,fields=editable[table];
 if(!fields||!['create','update','delete'].includes(action)||(table==='havdalah_voice_settings'&&action!=='update'))return Response.json({error:'Invalid request'},{status:400});
 const values=Object.fromEntries(Object.entries(body.values||{}).filter(([key])=>fields.includes(key)).map(([key,value])=>[key,['alternate_sponsor_from','alternate_sponsor_until'].includes(key)&&value===''?null:value]));
 let q;
 if(action==='create')q=a.db.from(table).insert(values);
 else{
  if(!(table==='havdalah_voice_settings'&&body.id==='main')&&!/^[a-f0-9-]{36}$/i.test(body.id||''))return Response.json({error:'Invalid ID'},{status:400});
  q=action==='delete'?a.db.from(table).delete().eq('id',body.id):a.db.from(table).update(values).eq('id',body.id);
 }
 const {data,error}=await q.select().single();
 if(error)return Response.json({error:error.message},{status:400});
 await a.db.from('havdalah_audit').insert({actor:a.user.id,action:action+' '+table,details:{id:data.id}});
 return Response.json({record:data});
}
