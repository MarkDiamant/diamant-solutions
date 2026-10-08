import {verifyTwilio} from '../../../../lib/havdalahTwilioAuth';
export const runtime='nodejs';
export async function POST(request){
 const authForm=await request.clone().formData().catch(()=>new FormData());
 if(!(await verifyTwilio(request,authForm)))return new Response('Forbidden',{status:403});
 return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Amy">Live Havdalah is beginning. Five. Four. Three. Two. One.</Say></Response>',{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store'}});
}
export async function GET(){return new Response('Method Not Allowed',{status:405});}
