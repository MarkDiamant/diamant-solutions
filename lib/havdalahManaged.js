import {createClient} from '@supabase/supabase-js';
import {calendar,HavdalahEvent,Location} from '@hebcal/core';
const db=()=>createClient(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.DS_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
export async function getManagedSlots(now=new Date(),toNumber){
 if(!process.env.DS_SUPABASE_SERVICE_ROLE_KEY)return null;
 const client=db();
 const [expiryResult,lineResult,locationsResult]=await Promise.all([
  client.from('havdalah_test_sessions').update({enabled:false}).eq('enabled',true).lt('scheduled_at',new Date(now.getTime()-5*60000).toISOString()),
  toNumber?client.from('havdalah_lines').select('location_id').eq('number',toNumber).eq('enabled',true).maybeSingle():Promise.resolve({data:null,error:null}),
  client.from('havdalah_locations').select('*').eq('enabled',true)
 ]);
 if(expiryResult.error)console.error('HAVDALAH_TEST_EXPIRY',expiryResult.error.message);
 if(toNumber&&!lineResult.data)return null;
 const location=toNumber?lineResult.data.location_id:null;
 const {data:locations,error}=locationsResult;
 if(error||!locations?.length)return null;
 const enabled=location?locations.filter(x=>x.id===location):locations;
 const result=[];
 const [slotsR,assignR,hostsR,exceptionsR,absencesR,testsR]=await Promise.all([
 client.from('havdalah_slots').select('*').eq('enabled',true).order('sort_order'),
 client.from('havdalah_assignments').select('priority,host_id,slot_id').order('priority'),
 client.from('havdalah_hosts').select('id,name,phone,enabled'),
 client.from('havdalah_exceptions').select('slot_id,session_date,disabled'),
 client.from('havdalah_host_absences').select('host_id,session_date'),
 client.from('havdalah_test_sessions').select('id,slot_id,scheduled_at,enabled').eq('enabled',true).gte('scheduled_at',new Date(now.getTime()-5*60000).toISOString()).lte('scheduled_at',new Date(now.getTime()+65*60000).toISOString())
 ]);
 for(const response of [slotsR,assignR,hostsR,exceptionsR,absencesR,testsR])if(response.error){console.error('HAVDALAH_SCHEDULE_QUERY',response.error.message);return null;}
 const slots=slotsR.data||[],assignments=assignR.data||[],hosts=hostsR.data||[],exceptions=exceptionsR.data||[],absences=absencesR.data||[];
 const eligibleHosts=(slotId,day)=>assignments.filter(a=>a.slot_id===slotId).map(a=>{const h=hosts.find(h=>h.id===a.host_id&&h.enabled);return h&&!absences.some(z=>z.host_id===h.id&&z.session_date===day)?{...h,priority:a.priority}:null;}).filter(Boolean);
 for(const place of enabled){
  const geo=new Location(place.latitude,place.longitude,false,place.timezone,place.name,place.country_code);
  const events=calendar({start:new Date(now.getTime()-12*3600000),end:new Date(now.getTime()+8*86400000),candlelighting:true,location:geo,havdalahDeg:Number(place.havdalah_degrees),il:place.country_code==='IL'});
  for(const event of events){
   if(!(event instanceof HavdalahEvent))continue;
   for(const slot of slots.filter(s=>s.location_id===place.id)){
    const time=new Date(event.eventTime.getTime()+slot.offset_minutes*60000);
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:place.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(time);
    if(exceptions.some(e=>e.slot_id===slot.id&&e.session_date===day&&e.disabled))continue;
    const selected=eligibleHosts(slot.id,day);
    if(!selected.length)continue;
    result.push({time,slot:slot.sort_order,label:slot.label,occasion:(event.linkedEvent?.hasFlag?.('YOM_TOV_ENDS')||event.linkedEvent?.hasFlag?.('CHAG'))?'yom_tov':'shabbos',conference:'havdalah-'+slot.id+'-'+day,hosts:selected,location:place,slotId:slot.id});
   }
  }
 }
 for(const test of testsR.data||[]){
  const slot=slots.find(s=>s.id===test.slot_id);
  const place=slot&&enabled.find(p=>p.id===slot.location_id);
  if(!place)continue;
  const selected=assignments.filter(a=>a.slot_id===slot.id).map(a=>{const h=hosts.find(h=>h.id===a.host_id&&h.enabled);return h?{...h,priority:a.priority}:null;}).filter(Boolean);
  if(selected.length)result.push({time:new Date(test.scheduled_at),slot:1,label:'Test session',occasion:'shabbos',conference:'havdalah-test-'+test.id,hosts:selected,location:place,slotId:test.id,isTest:true});
 }
 return result.sort((a,b)=>a.time-b.time);
}

export async function getActiveTestSlot(now=new Date(),toNumber){
 if(!process.env.DS_SUPABASE_SERVICE_ROLE_KEY)return null;
 const client=db();
 const {data:test,error}=await client.from('havdalah_test_sessions').select('id,slot_id,scheduled_at').eq('enabled',true).gte('scheduled_at',new Date(now.getTime()-10*60000).toISOString()).lte('scheduled_at',new Date(now.getTime()+60*60000).toISOString()).order('scheduled_at').limit(1).maybeSingle();
 if(error||!test)return null;
 const {data:slot}=await client.from('havdalah_slots').select('id,location_id').eq('id',test.slot_id).maybeSingle();
 if(!slot)return null;
 if(toNumber){const {data:line}=await client.from('havdalah_lines').select('location_id').eq('number',toNumber).eq('enabled',true).maybeSingle();if(!line||line.location_id!==slot.location_id)return null;}
 const {data:place}=await client.from('havdalah_locations').select('*').eq('id',slot.location_id).maybeSingle();
 if(!place)return null;
 const {data:assignments}=await client.from('havdalah_assignments').select('host_id,priority').eq('slot_id',slot.id).order('priority');
 const {data:hosts}=await client.from('havdalah_hosts').select('id,name,phone,enabled').in('id',(assignments||[]).map(a=>a.host_id));
 const eligible=(assignments||[]).map(a=>({...hosts?.find(h=>h.id===a.host_id),priority:a.priority})).filter(h=>h.id&&h.enabled);
 return {time:new Date(test.scheduled_at),slot:1,label:'Test session',occasion:'shabbos',conference:'havdalah-test-'+test.id,hosts:eligible,location:place,slotId:test.id,isTest:true};
}
