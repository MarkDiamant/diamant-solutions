// For a separately reviewed isolated app build only. No production db imports.
import {isolatedRecoveryAdapter} from './isolated-recovery-adapter.mjs';
import {updateRecoveredPassword} from '../../lib/business-software/recovered-password.mjs';
import {requestRecoveryLink} from '../../lib/business-software/request-recovery.mjs';
export function isolatedRecoveryHandlers(config,network){
 const deps=isolatedRecoveryAdapter(config,network);
 if(!deps.provider||typeof deps.fetcher!=='function'||typeof deps.centralRest!=='function'||typeof deps.tenantRecord!=='function')throw Error('Complete isolated dependencies required');
 const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
 const respond=async(request,handler,path)=>{
  const url=new URL(request.url);
  if(url.origin!==deps.appOrigin||request.headers.get('origin')!==deps.appOrigin)return Response.json({error:'Isolated origin required'},{status:403,headers});
  if(url.pathname!==path||url.search||url.hash)return Response.json({error:'Not found'},{status:404,headers});
  if(request.method!=='POST')return Response.json({error:'POST required'},{status:405,headers});
  const result=await handler(request,deps);
  return Response.json(result.body,{status:result.status,headers});
 };
 return {save:request=>respond(request,updateRecoveredPassword,'/api/business-software/recover-password'),requestLink:request=>respond(request,requestRecoveryLink,'/api/business-software/request-recovery')};
}
