"use strict";
// Read-only rollback planner: verifies every deployed tenant has a known, immutable prior artifact.
const fs=require("node:fs");
function planRollback(manifest){
 if(!manifest||!Array.isArray(manifest.tenants)||manifest.tenants.length===0)throw Error("Missing tenant inventory");
 const errors=[],targets=[];
 for(const tenant of manifest.tenants){
  const before=tenant.before||{},after=tenant.after||{};
  if(!tenant.id||!before.deploymentId||!before.packageIntegrity||!before.version||!after.deploymentId||!after.version){errors.push((tenant.id||"unknown")+": incomplete rollback evidence");continue}
  if(tenant.databaseMigration?.backwardCompatible!==true)errors.push(tenant.id+": migration backward compatibility not proven");
  if(tenant.backup?.verified!==true)errors.push(tenant.id+": database backup not verified");
  if(tenant.acceptance?.rollback!=="passed")errors.push(tenant.id+": rollback rehearsal not passed");
  targets.push({tenant:tenant.id,restoreDeployment:before.deploymentId,restoreVersion:before.version,restoreIntegrity:before.packageIntegrity,rollbackDatabase:false});
 }
 return {ready:errors.length===0,errors,targets};
}
if(require.main===module){try{const p=planRollback(JSON.parse(fs.readFileSync(process.argv[2],"utf8")));console.log(JSON.stringify(p,null,2));if(!p.ready)process.exitCode=1}catch(e){console.error(e.message);process.exitCode=2}}
module.exports={planRollback};
