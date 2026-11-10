const {test}=require("node:test");const assert=require("node:assert/strict");const {inventory}=require("../scripts/bms-vercel-deployment-inventory.cjs");
const env={VERCEL_TOKEN:"fixture",VERCEL_TEAM_ID:"fixture"};
const projects={projects:[{name:"diamant-solutions",id:"p1"},{name:"mjmetal",id:"p2"}]};
const responses={p1:{deployments:[{uid:"d1",state:"READY",meta:{githubCommitSha:"sha1",githubCommitMessage:"BMS core v1.0.43"}}]},p2:{deployments:[{uid:"d2",state:"READY",meta:{githubCommitSha:"sha2",githubCommitMessage:"Automatically consume shared BMS core v1.0.38"}}]}};
const fetcher=async url=>({ok:true,json:async()=>url.includes("/v9/projects")?projects:responses[new URL(url).searchParams.get("projectId")]});
test("read-only inventory exposes deployed M&J skew without claiming source equivalence",async()=>{const r=await inventory(fetcher,env);assert.equal(r.deployments.length,2);assert.equal(r.deployments.find(x=>x.project==="mjmetal").versionEvidence,"1.0.38");assert.equal(r.deployments.find(x=>x.project==="diamant-solutions").versionEvidence,"1.0.43")});
test("missing tenant deployment fails closed",async()=>{await assert.rejects(inventory(async url=>({ok:true,json:async()=>url.includes("/v9/projects")?{projects:[projects.projects[0]]}:responses.p1}),env),/Missing BMS deployment project mjmetal/)});
test("missing credentials fails closed",async()=>{await assert.rejects(inventory(fetcher,{}),/VERCEL_TOKEN/)});
