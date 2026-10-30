import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const middleware=read("middleware.ts");
const demo=read("app/api/bms-demo/[...path]/route.ts");
const dashboard=read("business-software-core/components/admin/CrmDashboardV3.tsx");
const runtime=read("app/bms-runtime/page.tsx");
const layout=read("app/bms-runtime/layout.tsx");
const wrapper=read("components/admin/CrmDashboardV5.tsx");
const checks=[
 ["Demo admin API uses isolated demo handlers",middleware.includes('if(isDemo&&path.startsWith("/api/admin/"))')&&middleware.includes('url.pathname="/api/bms-demo/"+path.slice("/api/admin/".length)')],
 ["Demo ledger uses fictional handler",middleware.includes('if(isDemo&&path==="/api/bms-live/payments/customer-ledger-summary")')],
 ["Live tenant API routing remains independent",middleware.includes('if(tenantHost&&path.startsWith("/api/admin/"))')],
 ["Demo has jobs/dashboard/job types/settings",['if(p==="jobs")','if(p==="dashboard")','if(p==="job-types")','if(p==="settings")'].every(s=>demo.includes(s))],
 ["Demo has archive and restore support",demo.includes('archivedAt:Object.prototype.hasOwnProperty.call(patch,"archived_at")')&&demo.includes('get("archived")==="1"')],
 ["Demo has customer ledger response",demo.includes('if(p==="payments/customer-ledger-summary")')],
 ["Shared dashboard makes standard admin API calls",['/api/admin/jobs','/api/admin/dashboard','/api/admin/job-types','/api/admin/settings'].every(s=>dashboard.includes(s))],
 ["Demo and live use shared dashboard component",runtime.includes("CrmDashboardV5")&&wrapper.includes('business-software-core/components/admin/CrmDashboardV5')],
 ["Demo and live load same Quick Edit stylesheet",layout.includes('import "./quick-edit-actions.css"')]
];
for(const [label,pass] of checks){console.log((pass?"PASS ":"FAIL ")+label);}
assert.ok(checks.every(([,pass])=>pass),"BMS demo/live parity guard failed");
