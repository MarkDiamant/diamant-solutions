import {calendar,HavdalahEvent,Location} from '@hebcal/core';
// Derive display metadata from the already-loaded configuration, without writes.
export function attendanceSessionInfo(name,data){
 const match=/^havdalah-(.+)-(\d{4}-\d{2}-\d{2})$/.exec(name||'');
 if(!match)return null;
 const slot=(data.havdalah_slots||[]).find(x=>x.id===match[1]);
 const place=slot&&(data.havdalah_locations||[]).find(x=>x.id===slot.location_id);
 if(!place)return null;
 try{
  const noon=new Date(match[2]+'T12:00:00Z');
  const events=calendar({start:new Date(noon.getTime()-86400000),end:new Date(noon.getTime()+86400000),candlelighting:true,location:new Location(place.latitude,place.longitude,false,place.timezone,place.name,place.country_code),havdalahDeg:Number(place.havdalah_degrees),il:place.country_code==='IL'});
  const event=events.find(e=>e instanceof HavdalahEvent&&new Intl.DateTimeFormat('en-CA',{timeZone:place.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(e.eventTime.getTime()+slot.offset_minutes*60000))===match[2]);
  const assignment=(data.havdalah_assignments||[]).find(x=>x.slot_id===slot.id&&Number(x.priority)===1);
  const host=(data.havdalah_hosts||[]).find(x=>x.id===assignment?.host_id);
  return {time:event?new Date(event.eventTime.getTime()+slot.offset_minutes*60000).toISOString():null,host:host?.name||null};
 }catch{return null;}
}
