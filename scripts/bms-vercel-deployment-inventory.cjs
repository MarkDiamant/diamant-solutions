"use strict";
// Read-only Vercel deployment inventory. Requires VERCEL_TOKEN and VERCEL_TEAM_ID.
// Fails closed when a known BMS target is missing. Does not read tenant customer data.
const fs=require("node:fs");
const required=["diamant-solutions"];
async function inventory(fetcher=global.fetch,env=process.env){
 const token=env.VERCEL_TOKEN,team=env.VERCEL_TEAM_ID;
 if(!token||!team)throw Error("VERCEL_TOKEN and VERCEL_TEAM_ID required");
 const get=async path=>{const r=await fetcher("https://api.vercel.com"+path+(path.includes("?")?"&":"?")+"teamId="+encodeURIComponent(team),{headers:{Authorization:"Bearer "+token}});if(!r.ok)throw Error(path+": "+r.status);return r.json()};
 const projects=await get("/v9/projects?limit=100");
 const found=(projects.projects||[]).filter(p=>required.includes(p.name));
 for(const name of required)if(!found.some(p=>p.name===name))throw Error("Missing BMS deployment project "+name);
 const deployments=[];
 const requiredDomains=["*.diamantsolutions.co.uk","mjmetal.diamantsolutions.co.uk","bms.diamantsolutions.co.uk"];
 const domains=[];
 for(const project of found){
  const details=await get("/v9/projects/"+encodeURIComponent(project.id));
  const attached=(details.domains||[]).map(x=>typeof x==="string"?x:x.name).filter(Boolean);
  for(const domain of requiredDomains)if(!attached.includes(domain))throw Error("Missing canonical tenant domain "+domain);
  domains.push(...attached);
  const x=await get("/v6/deployments?projectId="+encodeURIComponent(project.id)+"&target=production&limit=20");
  const live=(x.deployments||[]).find(d=>d.state==="READY");
  if(!live)throw Error("No READY production deployment for "+project.name);
  deployments.push({project:project.name,projectId:project.id,deploymentId:live.uid||live.id,gitSha:live.meta?.githubCommitSha||null,commitMessage:live.meta?.githubCommitMessage||null,versionEvidence:live.meta?.githubCommitMessage?.match(/(?:shared BMS core v|BMS core v)(\d+\.\d+\.\d+)/i)?.[1]||null});
 }
 return {observedAt:new Date().toISOString(),deployments,domains,warning:"Project inventory is not logical tenant inventory; verify database tenant registry and each domain separately."};
}
if(require.main===module)inventory().then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={inventory};
