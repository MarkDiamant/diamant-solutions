import {NextResponse} from 'next/server';
import {tenantRecord,centralRest} from '@/lib/business-software/db';
import {requestRecoveryLink} from '@/lib/business-software/request-recovery.mjs';
export async function POST(request:Request) {
 const result=await requestRecoveryLink(request,{tenantRecord,centralRest,enabledHosts:process.env.BMS_RECOVERY_ENABLED_HOSTS||''});
 return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
