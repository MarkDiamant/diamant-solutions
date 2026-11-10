// Preview-only credential validation. Never print keys or response bodies.
const assert=require('node:assert/strict');
(async()=>{
 if(process.env.BMS_TEST_ISOLATED!=='true'){console.log('Isolated Supabase credential probe skipped outside acceptance Preview');return;}
 const ref=process.env.BMS_TEST_SUPABASE_PROJECT_REF;
 const expected='https://'+ref+'.supabase.co';
 assert.equal(ref,'mhncjudrhevvbmsbvkta','Acceptance Preview must target the approved isolated project');
 for(const name of ['DS_SUPABASE_URL','SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL'])assert.equal(process.env[name],expected,name+' must target the isolated project');
 for(const name of ['DS_SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SERVICE_ROLE_KEY']){
  const key=process.env[name];assert.ok(key&&key.length>24,name+' is missing');
  const response=await fetch(expected+'/auth/v1/admin/users?page=1&per_page=1',{
   headers:{apikey:key,Authorization:'Bearer '+key},
   signal:AbortSignal.timeout(12000)
  });
  assert.equal(response.status,200,name+' did not authenticate to isolated Supabase Auth (HTTP '+response.status+')');
  console.log(name+': isolated Supabase Auth admin API verified');
 }
 console.log('Both isolated service-role credentials verified against '+ref);
})().catch(err=>{console.error('Isolated Supabase credential probe failed: '+err.message);process.exitCode=1;});
