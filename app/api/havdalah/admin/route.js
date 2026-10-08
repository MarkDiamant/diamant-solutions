import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const tableNames=['havdalah_locations','havdalah_lines','havdalah_hosts','havdalah_slots','havdalah_assignments','havdalah_exceptions','havdalah_host_absences','havdalah_audit'];
async function access(req){
 const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
 if(!token)return null;
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const service=process.env.DS_SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!service)return null;
 const publicClient=createClient(url,anon);
 const {data:{user},error}=await publicClient.auth.getUser(token);
 if(error||!user)return null;
 const db=createClient(url,service,{auth:{persistSession:false}});
 const {data:admin}=await db.from('internal_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 return admin?{db,user}:null;
}
export async function GET(req){
 const a=await access(req);if(!a)return Response.json({error:'Unauthorized'},{status:401});
 const result={};
 for(const name of tableNames){
  const {data,error}=await a.db.from(name).select('*').limit(500);
  if(error)return Response.json({error:error.message},{status:500});
  result[name]=data;
 }
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
}

const editable={
 havdalah_locations:['name','country_code','timezone','latitude','longitude','havdalah_degrees','enabled'],
 havdalah_lines:['number','location_id','enabled'],
 havdalah_hosts:['name','phone','enabled'],
 havdalah_slots:['location_id','label','offset_minutes','enabled','sort_order'],
 havdalah_assignments:['slot_id','host_id','priority'],
 havdalah_exceptions:['slot_id','session_date','disabled','notes'],
 havdalah_host_absences:['host_id','session_date','reason']
};
export async function POST(req){
 const a=await access(req);if(!a)return Response.json({error:'Unauthorized'},{status:401});
 const body=await req.json().catch(()=>null);
 const table=body?.table,action=body?.action,fields=editable[table];
 if(!fields||!['create','update','delete'].includes(action))return Response.json({error:'Invalid request'},{status:400});
 const values=Object.fromEntries(Object.entries(body.values||{}).filter(([key])=>fields.includes(key)));
 let q;
 if(action==='create')q=a.db.from(table).insert(values);
 else{
  if(!/^[a-f0-9-]{36}$/i.test(body.id||''))return Response.json({error:'Invalid ID'},{status:400});
  q=action==='delete'?a.db.from(table).delete().eq('id',body.id):a.db.from(table).update(values).eq('id',body.id);
 }
 const {data,error}=await q.select().single();
 if(error)return Response.json({error:error.message},{status:400});
 await a.db.from('havdalah_audit').insert({actor:a.user.id,action:action+' '+table,details:{id:data.id}});
 return Response.json({record:data});
}
