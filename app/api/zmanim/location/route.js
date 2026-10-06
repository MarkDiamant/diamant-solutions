export async function GET(req){
 const u=new URL(req.url),lat=u.searchParams.get('lat'),lon=u.searchParams.get('lon');
 if(!lat||!lon)return Response.json({name:''},{status:400});
 try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=12&addressdetails=1`,{headers:{'User-Agent':'DiamantSolutions-Zmanim/1.0 (diamantsolutions.co.uk)'}});
 const j=await r.json(),a=j.address||{}; const area=a.suburb||a.neighbourhood||a.town||a.city_district||a.city||a.village||a.county||''; const city=a.city||a.town||a.county||''; const country=a.country||'';
 const parts=[area,city!==area?city:'',country].filter(Boolean); return Response.json({name:[...new Set(parts)].join(', ')});
 }catch{return Response.json({name:''})}
}