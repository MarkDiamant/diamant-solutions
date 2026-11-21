import {NextResponse} from 'next/server';
// Source-only cutover candidate. This retires the legacy privileged mutation.
// Deployment alone does not prove already-running old invocations are drained.
export async function POST(){
 return NextResponse.json({error:'This setup link is no longer supported. Request a fresh password recovery link.'},{status:410,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
