// Provider reads only, deliberately on demand rather than continuous polling.
export async function getLiveAttendance({sid,key,secret,fetcher=fetch}) {
 if(!sid||!key||!secret)throw new Error('Live call check is not configured');
 const startedAt=new Date().toISOString();
 const root='https://api.twilio.com/2010-04-01/Accounts/'+encodeURIComponent(sid);
 const headers={Authorization:'Basic '+Buffer.from(key+':'+secret).toString('base64')};
 async function read(path){
  const response=await fetcher(root+path,{headers,cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('Live call check is unavailable');
  const result=await response.json();
  if(result.next_page_uri)throw new Error('Live call check is incomplete');
  return result;
 }
 const lists=await Promise.all(['init','in-progress'].map(status=>read('/Conferences.json?Status='+status+'&PageSize=1000')));
 if(lists.some(x=>!Array.isArray(x.conferences)))throw new Error('Live call check is unavailable');
 const rooms=[...new Map(lists.flatMap(x=>x.conferences).filter(x=>/^havdalah-[a-zA-Z0-9-]{1,130}$/.test(x.friendly_name||'')).map(x=>[x.sid,x])).values()];
 if(rooms.length>12)throw new Error('Live call check is incomplete');
 const listeners=new Set(),hosts=new Set(),sessions={};
 await Promise.all(rooms.map(async room=>{
  if(!/^CF[a-fA-F0-9]{32}$/.test(room.sid))throw new Error('Live call check is unavailable');
  const result=await read('/Conferences/'+room.sid+'/Participants.json?PageSize=1000');
  if(!Array.isArray(result.participants))throw new Error('Live call check is unavailable');
  const row=sessions[room.friendly_name]||(sessions[room.friendly_name]={listeners:new Set(),hosts:new Set()});
  for(const participant of result.participants){
   if(!participant.call_sid)throw new Error('Live call check is incomplete');
   if(participant.label?.startsWith('listener-')){listeners.add(participant.call_sid);row.listeners.add(participant.call_sid);}
   else if(participant.label?.startsWith('host-')){hosts.add(participant.call_sid);row.hosts.add(participant.call_sid);}
   else throw new Error('Live call roles could not be confirmed');
  }
 }));
 return {checked_at:new Date().toISOString(),check_started_at:startedAt,listeners:listeners.size,hosts:hosts.size,sessions:Object.fromEntries(Object.entries(sessions).map(([name,row])=>[name,{listeners:row.listeners.size,hosts:row.hosts.size}]))};
}
