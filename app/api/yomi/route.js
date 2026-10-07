const descriptions={
 'Amud HaYomi (Dirshu)':'One amud (page side) of Babylonian Talmud per day',
 'Daf HaYomi B’Halacha (Dirshu)':'Dirshu’s daily Mishnah Berurah program'
};
const clean=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&rsquo;/g,'’').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
function htmlReading(html,name){const start=html.indexOf(name);if(start<0)return null;const end=html.indexOf('Subscribe to '+name,start);if(end<0)return null;let s=clean(html.slice(start+name.length,end));const d=descriptions[name];if(d&&s.startsWith(d))s=s.slice(d.length).trim();return s||null}
export async function GET(req){
 const {searchParams}=new URL(req.url),date=searchParams.get('date');
 if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:'Invalid date'},{status:400});
 try{
  const q='cfg=json&v=1&start='+date+'&end='+date+'&F=on&myomi=on&nyomi=on&dps=on&dr1=on&dcc=on&dshl=on&dah=on&ddh=on';
  const jr=await fetch('https://www.hebcal.com/hebcal?'+q,{next:{revalidate:21600}});
  if(!jr.ok)throw new Error('Hebcal');
  const json=await jr.json();
  const wanted={
   dafyomi:'Daf Yomi',mishnayomi:'Mishnah Yomi',nachyomi:'Nach Yomi',
   dailyPsalms:'Tehillim Yomi',rambam1:'Rambam Yomi',chofetzChaim:'Chofetz Chaim Yomi',shemiratHaLashon:'Shemiras HaLashon',amudYomi:'Amud Yomi',dirshuAmudYomi:'Amud Yomi',dafHaYomiBHalacha:'Mishnah Berurah Yomi',dirshuDafHaYomiBHalacha:'Mishnah Berurah Yomi'
  };
  const items=(json.items||[]).filter(x=>wanted[x.category]).map(x=>({name:wanted[x.category],value:x.title,hebrew:x.hebrew||'',link:x.link||''}));
  const conv=await fetch('https://www.hebcal.com/converter?cfg=json&date='+date+'&g2h=1&strict=1',{next:{revalidate:86400}}).then(r=>r.json());
  return Response.json({date,hebrewDate:conv.hebrew||conv.heDateParts?.d+' '+conv.heDateParts?.m+' '+conv.hy,items});
 }catch{return Response.json({date,items:[],error:'Daily learning is temporarily unavailable.'},{status:502})}
}