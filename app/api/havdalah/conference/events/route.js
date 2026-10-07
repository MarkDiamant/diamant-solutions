export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request){
 const form=await request.formData().catch(()=>new FormData());
 const event=Object.fromEntries(form.entries());
 console.log('HAVDALAH_CONFERENCE_EVENT',JSON.stringify({event:event.StatusCallbackEvent||event.ConferenceStatusCallbackEvent,conferenceSid:event.ConferenceSid,conferenceName:event.FriendlyName,callSid:event.CallSid,participantLabel:event.ParticipantLabel,muted:event.Muted,timestamp:new Date().toISOString()}));
 return new Response(null,{status:204});
}
export async function GET(){return new Response('ok');}
