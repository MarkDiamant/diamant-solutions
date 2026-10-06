const RAD=Math.PI/180;
const sin=d=>Math.sin(d*RAD), cos=d=>Math.cos(d*RAD), tan=d=>Math.tan(d*RAD);
const asin=x=>Math.asin(x)/RAD, acos=x=>Math.acos(x)/RAD, atan=x=>Math.atan(x)/RAD;
const norm=(x,m)=>((x%m)+m)%m;
function dayOfYear(date){const y=date.getUTCFullYear();return Math.floor((date-Date.UTC(y,0,0))/86400000)}
function solarUtc(date,lat,lon,zenith,isRise=false){
 const n=dayOfYear(date), lngHour=lon/15, t=n+(((isRise?6:18)-lngHour)/24);
 const M=.9856*t-3.289; let L=M+1.916*sin(M)+.020*sin(2*M)+282.634; L=norm(L,360);
 let RA=atan(.91764*tan(L)); RA=norm(RA,360);
 const Lq=Math.floor(L/90)*90, RAq=Math.floor(RA/90)*90; RA=(RA+(Lq-RAq))/15;
 const sinDec=.39782*sin(L), cosDec=cos(asin(sinDec));
 const cosH=(cos(zenith)-sinDec*sin(lat))/(cosDec*cos(lat));
 if(cosH>1||cosH< -1)return null;
 let H=isRise?360-acos(cosH):acos(cosH); H/=15;
 const T=H+RA-.06571*t-6.622; return norm(T-lngHour,24);
}
export function solarTime(date,lat,lon,zenith=90.833){const h=solarUtc(date,lat,lon,zenith,false);if(h==null)return null;return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())+h*3600000)}
export const sunset=(d,lat,lon)=>solarTime(d,lat,lon,90.833);
export const tzeis85=(d,lat,lon)=>solarTime(d,lat,lon,98.5);
export function candleOffset(lat,lon){
 // MyZmanim's standard UK convention is 15m; Jerusalem 40m; Haifa 30m; default 18m.
 if(lat>49&&lat<61&&lon>-9&&lon<3)return 15;
 if(lat>31.65&&lat<32.15&&lon>35.0&&lon<35.35)return 40;
 if(lat>32.65&&lat<33.15&&lon>34.85&&lon<35.25)return 30;
 return 18;
}
export function cautiousTime(date,tz,direction='down'){if(!date)return 'Not available';const parts=new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);let h=+parts.find(p=>p.type==='hour').value,m=+parts.find(p=>p.type==='minute').value,s=+parts.find(p=>p.type==='second').value;if(direction==='up'&&s>0){m++;if(m===60){m=0;h=(h+1)%24}}const d=new Date(Date.UTC(2000,0,1,h,m));return new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',hour:'numeric',minute:'2-digit',hour12:true}).format(d)}
export function formatTime(date,tz){return cautiousTime(date,tz,'down')}
export function localDateLabel(date,tz){return new Intl.DateTimeFormat('en-GB',{timeZone:tz,weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date)}
