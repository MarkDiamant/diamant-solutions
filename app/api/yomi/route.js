export async function GET(req){
 const {searchParams}=new URL(req.url),date=searchParams.get('date');
 const d=date&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date:new Date().toISOString().slice(0,10);
 try{
  const r=await fetch('https://www.hebcal.com/learning/'+d,{next:{revalidate:3600}});
  if(!r.ok)throw new Error('Hebcal');
  const html=await r.text();
  const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
  const names=['Daf Yomi (Babylonian Talmud)','Amud HaYomi (Dirshu)','Mishna Yomi','Nach Yomi','Daf HaYomi B’Halacha (Dirshu)','Daily Chofetz Chaim','Daily Rambam (Mishneh Torah)','Daily Tehillim (Psalms)'];
  const items=[];
  for(const name of names){const i=html.indexOf(name);if(i<0)continue;const chunk=clean(html.slice(i,i+1800));const rest=chunk.slice(name.length).replace(/^\s+/,'');const parts=rest.split(/Subscribe to|Apple Google|####|Daily regimen|One amud|Two Mishnayot|Nevi’im|Dirshu’s|Jewish ethics|Maimonides’|Daily study/);let val=(parts[1]||parts[0]||'').trim();if(val.length>120)val=val.slice(0,120);items.push({name,value:val})}
  return Response.json({date:d,items});
 }catch{return Response.json({date:d,items:[],error:'Daily learning is temporarily unavailable.'},{status:502})}
}