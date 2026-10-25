import {tzeis85} from './zmanim';
// Returns the Gregorian daytime date corresponding to the current Hebrew date.
// Uses the visitor's device timezone and geographical coordinates.
export function currentYahrzeitDate(now=new Date(),location=null){
 const parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=k=>Number(parts.find(p=>p.type===k)?.value);
 const y=get('year'),m=get('month'),d=get('day');
 const localDay=new Date(y,m-1,d,12);
 if(location&&Number.isFinite(location.lat)&&Number.isFinite(location.lon)){
  // UTC noon is the solar-date anchor, matching the existing Shabbos calculator.
  const night=tzeis85(new Date(Date.UTC(y,m-1,d,12)),location.lat,location.lon);
  if(night&&now>=night)localDay.setDate(localDay.getDate()+1);
 }
 return [localDay.getFullYear(),String(localDay.getMonth()+1).padStart(2,'0'),String(localDay.getDate()).padStart(2,'0')].join('-');
}
