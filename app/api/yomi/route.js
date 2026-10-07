import '@hebcal/learning';
import {DailyLearning,HDate} from '@hebcal/core';
const SERIES=[
 ['dafYomi','Daf Yomi'],['dirshuAmudYomi','Amud Yomi'],['mishnaYomi','Mishnah Yomi'],['nachYomi','Nach Yomi'],
 ['dirshuDafHalacha','Mishnah Berurah Yomi'],['chofetzChaim','Chofetz Chaim Yomi'],['shemiratHaLashon','Shemiras HaLashon'],
 ['rambam1','Rambam Yomi'],['psalms','Tehillim Yomi']
];
const value=(ev,lang)=>{if(!ev)return '';const s=ev.render(lang)||'';const i=s.indexOf(': ');return i>=0?s.slice(i+2):s};
export async function GET(req){
 const {searchParams}=new URL(req.url),date=searchParams.get('date');
 if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:'Invalid date'},{status:400});
 try{
  const [y,m,d]=date.split('-').map(Number),hd=new HDate(new Date(Date.UTC(y,m-1,d))),items=[];
  for(const [calendar,name] of SERIES){const ev=DailyLearning.lookup(calendar,hd,false);if(ev)items.push({name,value:value(ev,'en'),hebrew:value(ev,'he')})}
  const hebrewDate=hd.render('he');
  return Response.json({date,hebrewDate,items,source:'Hebcal @hebcal/learning'});
 }catch(e){return Response.json({date,items:[],error:'Daily learning is temporarily unavailable.'},{status:502})}
}
