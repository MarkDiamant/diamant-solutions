import crypto from 'node:crypto';
const origin='https://diamantsolutions.co.uk';
// Twilio signs the URL configured on its number; proxies may expose a different request URL.
export async function verifyTwilio(request,form){
 const secret=process.env.TWILIO_AUTH_TOKEN;
 const provided=request.headers.get('x-twilio-signature')||'';
 if(!secret||!provided){console.error('HAVDALAH_TWILIO_AUTH_MISSING',{hasToken:!!secret,hasSignature:!!provided,path:new URL(request.url).pathname});return false;}
 const incoming=new URL(request.url);
 const canonical=origin+incoming.pathname+incoming.search;
 const params=Array.from(form.entries()).sort(([a],[b])=>a.localeCompare(b));
 const payload=canonical+params.map(([key,value])=>key+String(value)).join('');
 const urls=[canonical,incoming.toString()];
 // Support both the configured public URL and the URL observed behind the proxy.
 const valid=urls.some(url=>{
  const expected=crypto.createHmac('sha1',secret).update(url+params.map(([key,value])=>key+String(value)).join('')).digest('base64');
  const a=Buffer.from(provided),b=Buffer.from(expected);
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
 });
 if(!valid)console.error('HAVDALAH_TWILIO_SIGNATURE_MISMATCH',{path:incoming.pathname,host:incoming.host,formKeys:params.map(([k])=>k),hasSignature:!!provided});
 return valid;
}
