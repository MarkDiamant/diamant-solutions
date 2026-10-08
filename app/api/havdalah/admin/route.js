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
