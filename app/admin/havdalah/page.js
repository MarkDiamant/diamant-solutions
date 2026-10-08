'use client';
import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
const definitions={
 havdalah_locations:{title:'Cities and zmanim',fields:['name','country_code','timezone','latitude','longitude','havdalah_degrees','enabled']},
 havdalah_lines:{title:'Local phone lines',fields:['number','location_id','enabled']},
 havdalah_hosts:{title:'Hosts',fields:['name','phone','enabled']},
 havdalah_slots:{title:'Sessions',fields:['location_id','label','offset_minutes','sort_order','enabled']},
 havdalah_assignments:{title:'Primary and backup assignments',fields:['slot_id','host_id','priority']},
 havdalah_exceptions:{title:'Cancelled sessions by date',fields:['slot_id','session_date','disabled','notes']},
 havdalah_host_absences:{title:'Host absences',fields:['host_id','session_date','reason']}
};
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const client=url&&key?createClient(url,key):null;
export default function HavdalahAdmin(){
 const [session,setSession]=useState(null),[data,setData]=useState({}),[section,setSection]=useState('havdalah_locations'),[editing,setEditing]=useState(null),[form,setForm]=useState({}),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{if(!client)return;client.auth.getSession().then(({data})=>setSession(data.session));const {data:sub}=client.auth.onAuthStateChange((_event,s)=>setSession(s));return()=>sub.subscription.unsubscribe();},[]);
 async function load(){if(!session)return;setLoading(true);try{const r=await fetch('/api/havdalah/admin',{headers:{Authorization:'Bearer '+session.access_token}});const json=await r.json();if(!r.ok)throw Error(json.error);setData(json);setMessage('');}catch(e){setMessage(e.message);}finally{setLoading(false);}}
 useEffect(()=>{if(session)load();},[session]);
 async function save(action,id){
  setLoading(true);try{
   const r=await fetch('/api/havdalah/admin',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({table:section,action,id,values:form})});
   const json=await r.json();if(!r.ok)throw Error(json.error);setEditing(null);setForm({});await load();
  }catch(e){setMessage(e.message);}finally{setLoading(false);}
 }
 const def=definitions[section],rows=data[section]||[];
 const fieldInput=(field)=>{const value=form[field]??'';if(field==='enabled'||field==='disabled')return <select value={String(value)} onChange={e=>setForm({...form,[field]:e.target.value==='true'})}><option value="">Select</option><option value="true">Yes</option><option value="false">No</option></select>;
  if(field.endsWith('_id')){const target=field==='location_id'?'havdalah_locations':field==='host_id'?'havdalah_hosts':'havdalah_slots';return <select value={value} onChange={e=>setForm({...form,[field]:e.target.value})}><option value="">Select</option>{(data[target]||[]).map(x=><option key={x.id} value={x.id}>{x.name||x.label||x.number}</option>)}</select>;}
  return <input type={field==='session_date'?'date':/latitude|longitude|degrees|minutes|priority|sort_order/.test(field)?'number':'text'} step="any" value={value} onChange={e=>setForm({...form,[field]:e.target.value})} required={!['notes'].includes(field)}/>;};
 return <main style={{maxWidth:1180,margin:'40px auto',padding:20,fontFamily:'Arial,sans-serif'}}><h1>Havdalah Hotline Administration</h1><p>Manage cities, lines, hosts, backups, session times and cancellations.</p>
 {!session?<form onSubmit={async e=>{e.preventDefault();const {error}=await client.auth.signInWithPassword({email,password});if(error)setMessage(error.message);}}><h2>Administrator sign in</h2><input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)}/><input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/><button>Sign in</button></form>:<>
 <button onClick={()=>client.auth.signOut()}>Sign out</button>
 <nav style={{display:'flex',flexWrap:'wrap',gap:8,margin:'20px 0'}}>{Object.entries(definitions).map(([k,v])=><button key={k} onClick={()=>{setSection(k);setEditing(null);}} style={{padding:10,background:section===k?'#163a62':'#eee',color:section===k?'white':'black',border:0,borderRadius:6}}>{v.title}</button>)}</nav>
 <h2>{def.title}</h2><button onClick={()=>{setForm({});setEditing('new');}}>Add new</button> <button onClick={load}>Refresh</button>
 {editing&&<form onSubmit={e=>{e.preventDefault();save(editing==='new'?'create':'update',editing);}} style={{padding:18,border:'1px solid #ddd',margin:'15px 0',display:'grid',gap:12}}>{def.fields.map(f=><label key={f} style={{display:'grid',gap:5}}>{f.replaceAll('_',' ')}{fieldInput(f)}</label>)}<div><button disabled={loading}>Save</button> <button type="button" onClick={()=>setEditing(null)}>Cancel</button></div></form>}
 <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{def.fields.map(f=><th key={f} style={{textAlign:'left',padding:8}}>{f.replaceAll('_',' ')}</th>)}<th>Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}>{def.fields.map(f=><td key={f} style={{borderTop:'1px solid #ddd',padding:8}}>{String(row[f]??'')}</td>)}<td><button onClick={()=>{setForm(Object.fromEntries(def.fields.map(f=>[f,row[f]??''])));setEditing(row.id);}}>Edit</button> <button onClick={()=>{if(confirm('Delete this record?'))save('delete',row.id);}}>Delete</button></td></tr>)}</tbody></table></div>
 </>}{loading&&<p>Loading...</p>}{message&&<p role="alert">{message}</p>}</main>;
}
