export async function GET(req){
 const u=new URL(req.url),q=u.searchParams.get('q');
 if(!q)return Response.json({results:[]});
 try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`,{headers:{'User-Agent':'DiamantSolutions-Zmanim/1.0 (diamantsolutions.co.uk)'}});const j=await r.json();return Response.json({results:j.map(x=>({lat:+x.lat,lon:+x.lon,name:x.display_name,countryCode:x.address?.country_code||''}))})}catch{return Response.json({results:[]})}
}