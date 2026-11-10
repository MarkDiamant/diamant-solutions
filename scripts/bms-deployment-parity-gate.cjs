"use strict";
// Read-only deployment parity gate. Supply each tenant's observed deployed package version
// from a trusted deployment manifest or SBOM; never infer parity from a shared repository alone.
const fs=require("node:fs");
const path=require("node:path");
const semver=/^\d+\.\d+\.\d+$/;
function verify(manifest,expected){
 if(!semver.test(expected))throw Error("Invalid expected shared-core version");
 if(!manifest||!Array.isArray(manifest.tenants)||!manifest.tenants.length)throw Error("No tenant deployments enumerated");
 const ids=new Set();const errors=[];
 for(const tenant of manifest.tenants){
  if(!tenant||typeof tenant.id!=="string"||!tenant.id.trim()||ids.has(tenant.id)){errors.push("Missing or duplicate tenant ID");continue;}
  ids.add(tenant.id);
  if(!tenant.deploymentId||!tenant.gitSha||!tenant.packageIntegrity)errors.push(tenant.id+": missing deployed SHA, deployment ID or immutable package integrity");
  if(!semver.test(String(tenant.sharedCoreVersion||"")))errors.push(tenant.id+": deployed core version unverified");
  else if(tenant.sharedCoreVersion!==expected)errors.push(tenant.id+": deployed "+tenant.sharedCoreVersion+" != required "+expected);
  if(tenant.acceptance!=="passed")errors.push(tenant.id+": authenticated acceptance not passed");
 }
 return {ok:errors.length===0,errors,tenants:ids.size};
}
if(require.main===module){
 const file=process.argv[2],expected=process.argv[3];
 if(!file||!expected){console.error("Usage: node scripts/bms-deployment-parity-gate.cjs <verified-manifest.json> <expected-core-version>");process.exit(2);}
 try{const result=verify(JSON.parse(fs.readFileSync(path.resolve(file),"utf8")),expected);console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=2;}
}
module.exports={verify};
