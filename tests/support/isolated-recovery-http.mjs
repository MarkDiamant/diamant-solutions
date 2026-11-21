// Local synthetic boundary only. No CLI, environment reads or real transport.
import {createServer} from 'node:http';
import {isolatedRecoveryHandlers} from './isolated-recovery-handlers.mjs';
export function syntheticRecoveryServer(config, transport) {
 const handlers=isolatedRecoveryHandlers(config,transport);
 const host=new URL(config.appOrigin).host;
 return createServer(async (req,res)=>{
  const reject=status=>{res.writeHead(status,{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();};
  if(req.headers.host!==host||req.headers.origin!==config.appOrigin)return reject(403);
  if(req.method!=='POST')return reject(405);
  const handler=req.url==='/api/business-software/request-recovery'?handlers.requestLink:req.url==='/api/business-software/recover-password'?handlers.save:null;
  if(!handler)return reject(404);
  let size=0;const chunks=[];
  try {
   for await(const chunk of req){size+=chunk.length;if(size>16384)return reject(413);chunks.push(chunk);}
   const request=new Request(config.appOrigin+req.url,{method:'POST',headers:{origin:req.headers.origin,'content-type':req.headers['content-type']||'','content-length':String(size)},body:Buffer.concat(chunks)});
   const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
  }catch{return reject(503);}
 });
}
