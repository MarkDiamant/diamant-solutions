import {calendar,HavdalahEvent,Location} from '@hebcal/core';

const LONDON=Location.lookup('London');
const SLOT_OFFSETS=[20,40,60];
const TZ='Europe/London';

function dateKey(date){
  return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}

export function getUpcomingHavdalahSlots(now=new Date()){
  if(!LONDON) throw new Error('Hebcal London location is unavailable');
  const start=new Date(now.getTime()-12*60*60*1000);
  const end=new Date(now.getTime()+21*24*60*60*1000);
  const events=calendar({
    start,
    end,
    candlelighting:true,
    location:LONDON,
    havdalahDeg:8.5,
    il:false,
  });
  const slots=[];
  for(const event of events){
    if(!(event instanceof HavdalahEvent)) continue;
    const base=event.eventTime;
    const linked=event.linkedEvent;
    const isYomTov=Boolean(linked?.hasFlag?.('YOM_TOV_ENDS')||linked?.hasFlag?.('CHAG'));
    SLOT_OFFSETS.forEach((minutes,index)=>{
      const time=new Date(base.getTime()+minutes*60000);
      slots.push({
        time,
        label:isYomTov?'Motzaei Yom Tov':'Motzaei Shabbos',occasion:isYomTov?'yom_tov':'shabbos',
        slot:index+1,
        conference:`havdalah-${dateKey(time)}-${index+1}`,
      });
    });
  }
  return slots.sort((a,b)=>a.time-b.time);
}

export function getNextHavdalahSlot(now=new Date()){
  const graceMs=10*60*1000;
  return getUpcomingHavdalahSlots(now).find(slot=>slot.time.getTime()>=now.getTime()-graceMs)||null;
}
