const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('isolated webhook links only to branch-specific acceptance domain',()=>{
 const code=read('app/api/stripe/webhook/route.js');
 assert.match(code,/SITE_URL!=='https:\/\/bms-acceptance\.diamantsolutions\.co\.uk'/);
 assert.match(code,/BMS_TEST_SUPABASE_PROJECT_REF/);
 assert.match(code,/sk_test_/);
});
test('isolated build verifies both service-role credentials through Auth admin API',()=>{
 const probe=read('scripts/check-bms-preview-auth.cjs');
 for(const key of ['DS_SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SERVICE_ROLE_KEY'])assert.ok(probe.includes(key));
 assert.match(probe,/auth\/v1\/admin\/users/);
 assert.match(probe,/response\.status,200/);
 assert.doesNotMatch(probe,/console\.log\(key\)/);
});
test('Preview acceptance domain and URLs are never production URLs',()=>{
 const probe=read('scripts/check-bms-preview-auth.cjs');
 assert.match(probe,/mhncjudrhevvbmsbvkta/);
 assert.doesNotMatch(probe,/iepqggrfenfqrqyzqyed/);
});
