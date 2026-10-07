export async function GET(req){
 const {searchParams}=new URL(req.url),date=searchParams.get('date');
 if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:'Invalid date'},{status:400});
 try{
  const q='cfg=json&v=1&start='+date+'&end='+date+'&F=on&myomi=on&nyomi=on&dps=on&dr1=on&dcc=on&dshl=on&ayd=on&ddh=on';
  const [jr,cr]=await Promise.all([fetch('https://www.hebcal.com/hebcal?'+q,{next:{revalidate:21600}}),fetch('https://www.hebcal.com/converter?cfg=json&date='+date+'&g2h=1&strict=1',{next:{revalidate:86400}})]);
  if(!jr.ok||!cr.ok)throw new Error('Hebcal'); const json=await jr.json(),conv=await cr.json();
  const wanted={dafyomi:'Daf Yomi',mishnayomi:'Mishnah Yomi',nachyomi:'Nach Yomi',dailyPsalms:'Tehillim Yomi',rambam1:'Rambam Yomi',chofetzChaim:'Chofetz Chaim Yomi',shemiratHaLashon:'Shemiras HaLashon',amudYomi:'Amud Yomi',dirshuAmudYomi:'Amud Yomi',dafHaYomiBHalacha:'Mishnah Berurah Yomi',dirshuDafHaYomiBHalacha:'Mishnah Berurah Yomi'};
  const seen=new Set(),items=[]; for(const x of json.items||[]){const name=wanted[x.category];if(!name||seen.has(name))continue;seen.add(name);items.push({name,value:x.title,hebrew:x.hebrew||'',link:x.link||''})}
  return Response.json({date,hebrewDate:conv.hebrew||'',items,source:'Hebcal'});
 }catch{return Response.json({date,items:[],error:'Daily learning is temporarily unavailable.'},{status:502})}
}
