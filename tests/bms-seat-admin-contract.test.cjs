const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const route=fs.readFileSync(path.join(__dirname,"../app/api/bms-live/[...path]/route.ts"),"utf8");
const ui=fs.readFileSync(path.join(__dirname,"../app/bms-runtime/users/page.tsx"),"utf8");
const webhook=fs.readFileSync(path.join(__dirname,"../app/api/stripe/bms-seats-webhook/route.ts"),"utf8");
test("GET, POST, PATCH and seat billing routes require tenant admin with both permissions",()=>{
 const patterns=[...route.matchAll(/if\(p==="users"\)\{if\(!\["admin","owner"\]\.includes\(member\.role\)\|\|!canBms\(member,"manage_users"\)\|\|!canBms\(member,"manage_business_settings"\)\)/g)];
 assert.equal(patterns.length,3);
 for(const routeName of ["users/seats/checkout","users/billing-portal"]){
  const i=route.indexOf('if(p==="'+routeName+'")');assert.ok(i>0);
  assert.match(route.slice(i,i+300),/Tenant administrator permission required/);
 }
});
test("invitation and reactivation both reserve pending seats and fail closed",()=>{
 assert.ok((route.match(/status=in\.\(active,invited,pending\)/g)||[]).length>=3);
 assert.match(route,/Unable to verify paid user allowance/);
 assert.match(route,/All paid user seats are occupied/);
 assert.match(route,/status:"invited"/);
});
test("protected owner, role escalation and malformed statuses are rejected by API",()=>{
 assert.match(route,/Protected tenant owner cannot be modified/);
 assert.ok((route.match(/allowedUserRoles=\["admin","manager","office","sales","field","worker","custom"\]/g)||[]).length>=2);
 assert.match(route,/Invalid user role/);assert.match(route,/Invalid user status/);
 assert.match(route,/Invalid user permissions/);
 assert.match(route,/You cannot change your own role or permissions/);
});
test("user changes do not mutate Stripe billing, billing is explicit admin-only flow",()=>{
 const a=route.indexOf('if(p==="users"){',route.indexOf('export async function PATCH'));
 const b=route.indexOf('if(parts[0]==="jobs"',a);
 const patch=route.slice(a,b);
 assert.ok(a>0&&b>a);
 assert.doesNotMatch(patch,/api\\.stripe\\.com|refunds/);
 assert.match(ui,/manageSeats/);
 assert.match(route,/if\(p==="users\/billing-portal"\)/);
 assert.match(webhook,/invoice\.paid/);
});
test("each request revalidates active membership rather than trusting cached JWT roles",()=>{
 assert.match(route,/bms_login_membership/);
 assert.match(route,/if\(!member\)return NextResponse\.json\(\{error:"Unauthorised"\}/);
});

test("fictional Flooring client guard selects flooring, never Northstar, for every shared API",()=>{
 const guard=fs.readFileSync(path.join(__dirname,"../components/BmsRuntimeGuard.tsx"),"utf8");
 assert.match(guard,/const KEYS=\[[^\]]*"flooring"\]/);
 assert.match(guard,/u\.searchParams\.set\("sample",sample\)/);
});
