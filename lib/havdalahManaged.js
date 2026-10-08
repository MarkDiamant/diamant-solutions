import {createClient} from '@supabase/supabase-js';
import {calendar,HavdalahEvent,Location} from '@hebcal/core';
const db=()=>createClient(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.DS_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
export async function getManagedSlots(now=new Date(),toNumber){
 if(!process.env.DS_SUPABASE_SERVICE_ROLE_KEY)return null;
 const client=db();
 let location;
 if(toNumber){const {data:line}=await client.from('havdalah_lines').select('location_id').eq('number',toNumber).eq('enabled',true).maybeSingle();if(!line)return null;location=line.location_id;}
 const {data:locations,error}=await client.from('havdalah_locations').select('*').eq('enabled',true);
 if(error||!locations?.length)return null;
 const enabled=location?locations.filter(x=>x.id===location):locations;
 const result=[];
 for(const place of enabled){
  const {data:slots}=await client.from('havdalah_slots').select('*').eq('location_id',place.id).eq('enabled',true).order('sort_order');
  if(!slots?.length)continue;
  const geo=new Location(place.latitude,place.longitude,false,place.timezone,place.name,place.country_code);
  const events=calendar({start:new Date(now.getTime()-12*3600000),end:new Date(now.getTime()+8*86400000),candlelighting:true,location:geo,havdalahDeg:Number(place.havdalah_degrees),il:place.country_code==='IL'});
  for(const event of events){
   if(!(event instanceof HavdalahEvent))continue;
   for(const slot of slots){
    const time=new Date(event.eventTime.getTime()+slot.offset_minutes*60000);
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:place.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(time);
    const {data:exception}=await client.from('havdalah_exceptions').select('disabled').eq('slot_id',slot.id).eq('session_date',day).maybeSingle();
    if(exception?.disabled)continue;
    const {data:assignments}=await client.from('havdalah_assignments').select('priority,host_id').eq('slot_id',slot.id).order('priority');
    const hosts=[];
    for(const assignment of assignments||[]){
     const {data:host}=await client.from('havdalah_hosts').select('id,name,phone,enabled').eq('id',assignment.host_id).maybeSingle();
     if(!host?.enabled)continue;
     const {data:absence}=await client.from('havdalah_host_absences').select('id').eq('host_id',host.id).eq('session_date',day).maybeSingle();
     if(!absence)hosts.push({...host,priority:assignment.priority});
    }
    if(!hosts.length)continue;
    result.push({time,slot:slot.sort_order,label:slot.label,conference:'havdalah-'+place.id+'-'+day,hosts,location:place,slotId:slot.id});
   }
  }
 }
 return result.sort((a,b)=>a.time-b.time);
}
