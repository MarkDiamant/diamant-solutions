const fs=require('node:fs'),crypto=require('node:crypto');
const domains=['diamantsolutions.co.uk','bms.diamantsolutions.co.uk'];
function validate(x,e,{production=false,now=Date.now()}={}){
 if(!x||x.schema!==1||!Number.isFinite(Date.parse(x.checkedAt))||Date.parse(x.checkedAt)>now+30000||now-Date.parse(x.checkedAt)>120000)throw Error('Fresh controller evidence required');
 for(const k of ['releaseId','sourceTreeHash','gitSha','projectId','deploymentId','target'])if(x[k]!==e[k])throw Error('Identity mismatch '+k);
 if(x.readyState!=='READY'||!/^https:\/\/[a-z0-9-]+\.vercel\.app\/$/.test(x.immutableUrl))throw Error('Immutable Ready URL required');
 if(x.buildMachine?.selection!=='fixed'||x.buildMachine?.cores!==4||x.buildMachine?.memoryMb!==8192)throw Error('Fixed standard build required');
 if(!Array.isArray(x.functions)||!x.functions.length)throw Error('Full emitted inventory required');
 const canonical=f=>JSON.stringify({path:f.path,memoryMb:f.memoryMb,maxDuration:f.maxDuration,runtime:f.runtime,regions:[...f.regions].sort()});
 const actual=new Map();for(const f of x.functions){if(!f.path||actual.has(f.path)||!Array.isArray(f.regions)||!Number.isInteger(f.memoryMb)||!Number.isInteger(f.maxDuration)||!f.runtime)throw Error('Malformed or duplicate inventory entry');actual.set(f.path,f)}
 if(!Array.isArray(e.baselineFunctions))throw Error('Reviewed full baseline required');const baseline=new Map(e.baselineFunctions.map(f=>[f.path,f]));
 const approved=new Map((e.reviewedInventoryChanges||[]).map(f=>[f.path,f]));
 for(const [path,f] of actual){const expected=approved.get(path)||baseline.get(path);if(!expected||canonical(f)!==canonical(expected))throw Error('Unreviewed full inventory drift '+path)}
 for(const [path] of baseline)if(!actual.has(path)&&!(e.reviewedRemovedPaths||[]).includes(path))throw Error('Unreviewed missing inventory path '+path);
 for(const path of e.requiredFunctionPaths){const f=actual.get(path);if(!f||f.memoryMb!==2048||f.maxDuration!==300||f.runtime!=='nodejs24.x'||JSON.stringify([...f.regions].sort())!=='["iad1"]')throw Error('Tested route configuration mismatch '+path)}
 if(production)for(const domain of domains){const a=x.aliases?.find(a=>a.alias===domain);if(!a||a.deploymentId!==e.deploymentId||a.projectId!==e.projectId||a.redirect!==null)throw Error('Alias binding mismatch '+domain)}
 if(!Array.isArray(x.rawEvidence)||!x.rawEvidence.length||x.rawEvidence.some(r=>!r.file||r.sanitized!==true||!Array.isArray(r.omittedFields)||!/^[a-f0-9]{64}$/.test(r.sha256)))throw Error('Raw provider evidence references required');return true;
}
function create(dir,expected){fs.mkdirSync(dir,{recursive:true});const path=dir+'/controller-state.json';fs.writeFileSync(path,JSON.stringify({expected,stages:{}},null,2),{flag:'wx',mode:0o600});return path;}
function admit(path,stage,evidence){const lock=path+'.lock';const fd=fs.openSync(lock,'wx');try{const s=JSON.parse(fs.readFileSync(path));if(!['preview','production'].includes(stage)||s.stages[stage])throw Error('Stage already consumed or unknown');validate(evidence,s.expected[stage],{production:stage==='production'});s.stages[stage]={status:'CONSUMED_BEFORE_NETWORK',admittedAt:new Date().toISOString(),preEvidenceHash:crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex')};fs.writeFileSync(path,JSON.stringify(s,null,2));return s.stages[stage];}finally{fs.closeSync(fd);fs.unlinkSync(lock)}}
function finish(path,stage,evidence,results){const s=JSON.parse(fs.readFileSync(path));if(s.stages[stage]?.status!=='CONSUMED_BEFORE_NETWORK')throw Error('Missing reservation');validate(evidence,s.expected[stage],{production:stage==='production'});if(!results||!results.every(r=>r.passed&&r.artifact&&/^[a-f0-9]{64}$/.test(r.sha256)))throw Error('Verified results required');const required=stage==='production'?['embedded-desktop','embedded-mobile','final-labour-entry','charity-marketing']:['embedded-desktop','embedded-mobile','charity-marketing'];for(const name of required)if(!results.some(r=>r.name===name))throw Error('Missing acceptance '+name);s.stages[stage].status='ACCEPTED';s.stages[stage].postEvidenceHash=crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex');s.stages[stage].results=results;fs.writeFileSync(path,JSON.stringify(s,null,2));}
module.exports={validate,create,admit,finish};
