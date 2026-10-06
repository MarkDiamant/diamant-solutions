const RAD=Math.PI/180;
const sin=d=>Math.sin(d*RAD), cos=d=>Math.cos(d*RAD), tan=d=>Math.tan(d*RAD);
const acos=x=>Math.acos(x)/RAD;
const norm=(x,m)=>((x%m)+m)%m;
const julian=d=>d.getTime()/86400000+2440587.5;
const jc=jd=>(jd-2451545)/36525;
const meanLong=t=>norm(280.46646+t*(36000.76983+t*.0003032),360);
const meanAnom=t=>357.52911+t*(35999.05029-.0001537*t);
const eccentricity=t=>.016708634-t*(.000042037+.0000001267*t);
function sunEq(t){const m=meanAnom(t);return sin(m)*(1.914602-t*(.004817+.000014*t))+sin(2*m)*(.019993-.000101*t)+sin(3*m)*.000289}
function obliq(t){const sec=21.448-t*(46.815+t*(.00059-t*.001813));return 23+(26+sec/60)/60}
function obliqCorr(t){return obliq(t)+.00256*cos(125.04-1934.136*t)}
function appLong(t){return meanLong(t)+sunEq(t)-.00569-.00478*sin(125.04-1934.136*t)}
function decl(t){return Math.asin(sin(obliqCorr(t))*sin(appLong(t)))/RAD}
function eqTime(t){const e=eccentricity(t),m=meanAnom(t),l=meanLong(t),y=tan(obliqCorr(t)/2)**2;return 4/RAD*(y*sin(2*l)-2*e*sin(m)+4*e*y*sin(m)*cos(2*l)-.5*y*y*sin(4*l)-1.25*e*e*sin(2*m))}
function eventMinutes(t,lat,lon,zenith){const d=decl(t),x=(cos(zenith)/(cos(lat)*cos(d)))-tan(lat)*tan(d);if(x>1||x< -1)return null;const h=acos(x);return 720-4*(lon-h)-eqTime(t)}
export function solarTime(date,lat,lon,zenith=90.833){const base=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());let t=jc(julian(new Date(base+12*3600000))),mins=eventMinutes(t,lat,lon,zenith);if(mins==null)return null;t=jc(julian(new Date(base+mins*60000)));mins=eventMinutes(t,lat,lon,zenith);return mins==null?null:new Date(base+mins*60000)}
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
