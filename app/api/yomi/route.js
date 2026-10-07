import '@hebcal/learning';
import {DailyLearning,HDate} from '@hebcal/core';
const SERIES=[
 ['dafYomi','Daf Yomi'],['dirshuAmudYomi','Amud Yomi'],['mishnaYomi','Mishnah Yomi'],['nachYomi','Nach Yomi'],
 ['dirshuDafHalacha','Mishnah Berurah Yomi'],['chofetzChaim','Chofetz Chaim Yomi'],['shemiratHaLashon','Shemiras HaLashon'],
 ['rambam1','Rambam Yomi'],['psalms','Tehillim Yomi']
];
const value=(ev,lang)=>{if(!ev)return '';const s=ev.render(lang)||'';const i=s.indexOf(': ');return i>=0?s.slice(i+2):s};
const ASHKENAZI=[
 ['Bechorot','Bechoros'],['Berakhot','Berachos'],['Shabbat','Shabbos'],['Eruvin','Eruvin'],['Pesachim','Pesachim'],['Shekalim','Shekalim'],['Yoma','Yoma'],['Sukkah','Sukkah'],['Beitzah','Beitzah'],['Rosh Hashana','Rosh Hashanah'],['Taanit','Taanis'],['Megillah','Megillah'],['Moed Katan','Moed Katan'],['Chagigah','Chagigah'],['Yevamot','Yevamos'],['Ketubot','Kesubos'],['Nedarim','Nedarim'],['Nazir','Nazir'],['Sotah','Sotah'],['Gittin','Gittin'],['Kiddushin','Kiddushin'],['Bava Kamma','Bava Kamma'],['Bava Metzia','Bava Metzia'],['Bava Batra','Bava Basra'],['Sanhedrin','Sanhedrin'],['Makkot','Makkos'],['Shevuot','Shevuos'],['Avodah Zarah','Avodah Zarah'],['Horayot','Horayos'],['Zevachim','Zevachim'],['Menachot','Menachos'],['Chullin','Chullin'],['Arakhin','Arachin'],['Temurah','Temurah'],['Keritot','Kerisus'],['Meilah','Meilah'],['Tamid','Tamid'],['Niddah','Niddah'],['Oholot','Ohalos']
];
function ashkenazi(s){let out=String(s||'').replace(/Book One/gi,'Sefer Rishon').replace(/Book Two/gi,'Sefer Sheini').replace(/Book Three/gi,'Sefer Shelishi');for(const [a,b] of ASHKENAZI)out=out.replace(new RegExp('^'+a+'\\b'),b);return out}
const HEB={1:'א',2:'ב',3:'ג',4:'ד',5:'ה',6:'ו',7:'ז',8:'ח',9:'ט',10:'י',11:'יא',12:'יב',13:'יג',14:'יד',15:'טו',16:'טז',17:'יז',18:'יח',19:'יט',20:'כ',30:'ל',40:'מ',50:'נ',60:'ס',70:'ע',80:'פ',90:'צ',100:'ק',200:'ר',300:'ש',400:'ת'};
function hn(n){n=+n;if(!n||n<1)return String(n);let out='';for(const v of [400,300,200,100,90,80,70,60,50,40,30,20])while(n>=v){out+=HEB[v];n-=v}if(n===15)return out+'טו';if(n===16)return out+'טז';if(n>=10){out+='י';n-=10}return out+(HEB[n]||'')}
function hebrewRefs(s){return String(s||'').replace(/[\u0591-\u05C7]/g,'').replace(/Book One/gi,'ספר ראשון').replace(/Book Two/gi,'ספר שני').replace(/Book Three/gi,'ספר שלישי').replace(/\d+/g,n=>hn(n)).replace(/\s+/g,' ').trim()}
export async function GET(req){
 const {searchParams}=new URL(req.url),date=searchParams.get('date');
 if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:'Invalid date'},{status:400});
 try{
  const [y,m,d]=date.split('-').map(Number),hd=new HDate(new Date(Date.UTC(y,m-1,d))),items=[];
  for(const [calendar,name] of SERIES){const ev=DailyLearning.lookup(calendar,hd,false);if(ev){let display=ashkenazi(value(ev,'en'));if(name==='Tehillim Yomi')display=display.replace(/^(\d+):(\d+)[–-](\d+)$/,'Psalm $1, verses $2–$3');items.push({name,value:display,hebrew:hebrewRefs(value(ev,'he')),url:typeof ev.url==='function'?ev.url():''})}}
  const hebrewDate=hd.render('en'); const hebrewDateHebrew=hd.render('he');
  return Response.json({date,hebrewDate,hebrewDateHebrew,items,source:'Hebcal @hebcal/learning'});
 }catch(e){return Response.json({date,items:[],error:'Daily learning is temporarily unavailable.'},{status:502})}
}
