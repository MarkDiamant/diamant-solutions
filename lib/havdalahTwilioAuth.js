import crypto from 'node:crypto';
const origin='https://diamantsolutions.co.uk';
export async function verifyTwilio(request,form){
 const secret=process.env.TWILIO_AUTH_TOKEN;
 const provided=request.headers.get('x-twilio-signature')||'';
 if(!secret||!provided)return false;
 const incoming=new URL(request.url);
 const canonical=origin+incoming.pathname+incoming.search;
 const params=Array.from(form.entries()).sort(([a],[b])=>a.localeCompare(b));
 const payload=canonical+params.map(([key,value])=>key+String(value)).join('');
 const expected=crypto.createHmac('sha1',secret).update(payload).digest('base64');
 const a=Buffer.from(provided),b=Buffer.from(expected);
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
