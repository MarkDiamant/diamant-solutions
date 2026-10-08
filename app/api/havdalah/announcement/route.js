export const runtime='nodejs';
export async function POST(){
 return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Amy">Live Havdalah is beginning. Five. Four. Three. Two. One.</Say></Response>',{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});
}
export async function GET(){return POST();}
