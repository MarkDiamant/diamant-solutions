// London local calendar date, advancing at tzeis (8.5 degrees below horizon).
const parts = d => {const x=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(p=>[p.type,p.value]));return [+x.year,+x.month,+x.day]};
export function currentYahrzeitDate(now=new Date()){
 const [y,m,d]=parts(now), rad=Math.PI/180, latitude=51.5074*rad, longitude=-0.1278;
 const jd=Date.UTC(y,m-1,d,12)/86400000+2440587.5;
 const n=Math.round(jd-2451545.0009-longitude/360);
 const j=2451545.0009+longitude/360+n;
 const M=(357.5291+0.98560028*(j-2451545))*rad;
 const L=M+(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M))*rad+102.9372*rad+Math.PI;
 const transit=j+0.0053*Math.sin(M)-0.0069*Math.sin(2*L);
 const decl=Math.asin(Math.sin(L)*Math.sin(23.44*rad));
 const cosine=(Math.sin(-8.5*rad)-Math.sin(latitude)*Math.sin(decl))/(Math.cos(latitude)*Math.cos(decl));
 const tzeis=new Date((transit+Math.acos(Math.max(-1,Math.min(1,cosine)))/(2*Math.PI)-2440587.5)*86400000);
 const day=new Date(y,m-1,d);if(now>=tzeis)day.setDate(day.getDate()+1);
 return [day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-');
}