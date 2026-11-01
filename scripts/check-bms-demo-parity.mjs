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
 ["Live tenant API routing remains independent",middleware.includes('if(tenantHost){')&&middleware.includes('if(path.startsWith("/api/admin/"))')],
 ["Demo has jobs/dashboard/job types/settings",['if(p==="jobs")','if(p==="dashboard")','if(p==="job-types")','if(p==="settings")'].every(s=>demo.includes(s))],
 ["Demo has archive and restore support",demo.includes('archivedAt:Object.prototype.hasOwnProperty.call(patch,"archived_at")')&&demo.includes('get("archived")==="1"')],
 ["Demo has customer ledger response",demo.includes('if(p==="payments/customer-ledger-summary")')],
 ["Quick Edit never injects tenant-specific workforce panels",!dashboard.includes('Workforce costs')],
 ["Quick Edit never expands with data-dependent payment history",!dashboard.includes('j.customerPayments?.length>0&&<div className="mt-3 overflow-hidden')],
 ["Shared dashboard makes standard admin API calls",['/api/admin/jobs','/api/admin/dashboard','/api/admin/job-types','/api/admin/settings'].every(s=>dashboard.includes(s))],
 ["Demo and live use shared dashboard component",runtime.includes("CrmDashboardV5")&&wrapper.includes('business-software-core/components/admin/CrmDashboardV5')],
 ["Demo and live load same Quick Edit stylesheet",layout.includes('import "./quick-edit-actions.css"')]
];
const brandingCss=read("app/bms-runtime/bms.css");
const brandBar=read("business-software-core/components/admin/AdminBrandBar.tsx");
const directory=read("components/admin/BusinessDirectory.tsx");
const tasks=read("business-software-core/components/admin/TasksPanel.tsx");
const purchasing=read("business-software-core/components/admin/PurchasingWorkspace.tsx");
const users=read("app/bms-runtime/users/page.tsx");
const integrations=read("business-software-core/components/admin/IntegrationsPage.tsx");
const campaigns=read("components/admin/CampaignsPanel.tsx");
const settings=read("app/bms-runtime/settings/page.tsx");
const demoBrandColours=["#17385f","#d27832","#377d68","#7656a6","#536f91","#6c7f45","#9a6744"];
checks.push(
 ["All seven demos have explicit shared-shell brand tokens",demoBrandColours.every(c=>brandBar.includes(c))&&brandBar.includes('shell.style.setProperty("--bms-accent",safe)')],
 ["Shared primary actions enforce white foreground",brandingCss.includes(".bms-shell .bms-primary-button")&&brandingCss.includes("color:#fff!important")],
 ["Dashboard and Quotes new-job button has white text",brandBar.includes('className="bms-new-job-button" style={{backgroundColor:brand,color:"#ffffff"}}')],
 ["Jobs Quotes Invoices Workforce primary actions use tenant token",directory.includes('backgroundColor:"var(--bms-accent)",color:"#fff"')],
 ["Tasks primary actions use canonical class",tasks.includes("bms-primary-button px-4 py-3")&&tasks.includes("bms-primary-button py-3")],
 ["Purchasing primary actions use canonical class",!purchasing.includes("bg-slate-900")&&purchasing.includes("bms-primary-button")],
 ["Users add button uses canonical class",users.includes("bms-primary-button rounded-xl")],
 ["Integration connection buttons use canonical class",integrations.includes("bms-primary-button rounded-xl")],
 ["Demo settings do not inherit Northstar contact or banking details",settings.includes("businessDetails:{...DEFAULT_CRM_CONFIG.businessDetails}")],
 ["Demo campaigns do not inherit Northstar identity",campaigns.includes("businessDetails:{...DEFAULT_CRM_CONFIG.businessDetails}")&&campaigns.includes("tenantKey:key")]
);
for(const [label,pass] of checks){console.log((pass?"PASS ":"FAIL ")+label);}
assert.ok(checks.every(([,pass])=>pass),"BMS demo/live parity guard failed");
