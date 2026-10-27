/** Actual elapsed job hours overlapping a local calendar day, including overnight shifts and DST. */
export function hoursOnLocalDay(start:string,end:string,day:Date=new Date()):number{
 const from=new Date(start).getTime(),to=new Date(end).getTime();
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return 0;
 const dayStart=new Date(day);dayStart.setHours(0,0,0,0);
 const nextDay=new Date(dayStart);nextDay.setDate(nextDay.getDate()+1);
 return Math.max(0,Math.min(to,nextDay.getTime())-Math.max(from,dayStart.getTime()))/3600000;
}
