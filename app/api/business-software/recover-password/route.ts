import {NextResponse} from 'next/server';
import {tenantRecord} from '@/lib/business-software/db';
import {updateRecoveredPassword} from '@/lib/business-software/recovered-password.mjs';
export async function POST(request:Request) {
 const result = await updateRecoveredPassword(request, {tenantRecord});
 return NextResponse.json(result.body, {status:result.status, headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
