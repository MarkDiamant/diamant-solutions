export const dynamic='force-dynamic';
export async function POST(){
 return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Amy">Please remain on the line. Your call is muted and nobody can hear you. Live Havdalah will begin shortly.</Say><Pause length="45"/><Redirect method="POST">/api/havdalah/wait</Redirect></Response>',{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});
}
export async function GET(){return POST();}
