const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const nav=fs.readFileSync("business-software-core/components/admin/AdminBrandBar.tsx","utf8");
const css=fs.readFileSync("app/bms-runtime/bms.css","utf8");
const api=fs.readFileSync("app/api/bms-live/[...path]/route.ts","utf8");
test("shared sidebar replaces horizontal menu and preserves tenant branding",()=>{
 assert.match(nav,/bms-sidebar/);assert.match(nav,/config\?\.logoUrl/);
 assert.match(nav,/config\?\.accentColour/);assert.doesNotMatch(nav,/overflow-x-auto/);
});
test("navigation groups cover actual core routes without duplicate menu hrefs",()=>{
 for(const group of ["Overview","Sales & Customers","Products & Operations","Finance","Workforce","Documents","Administration"])assert.ok(nav.includes('name:"'+group+'"'));
 const hrefs=[...nav.matchAll(/\{href:"([^"]+)",label:/g)].map(m=>m[1]);
 assert.equal(new Set(hrefs).size,hrefs.length);
 for(const href of hrefs){if(href==="/")continue;assert.ok(fs.existsSync("app/bms-runtime"+href+"/page.tsx"),"missing route "+href);}
});
test("mobile drawer, icon-only mode, and persisted sections are implemented",()=>{
 assert.match(nav,/aria-expanded=\{mobileOpen\}/);
 assert.match(nav,/aria-expanded=\{expanded\}/);
 assert.match(nav,/localStorage\.setItem\(sectionsKey/);
 assert.match(nav,/localStorage\.setItem\(storeKey/);
 assert.match(css,/@media\(max-width:850px\)/);
 assert.match(css,/bms-sidebar-mobile-open/);
});
test("Ruby, job creation, permissions and session scoping remain available",()=>{
 assert.match(nav,/href=\{go\("\/ai"\)\}/);
 assert.match(nav,/href=\{go\("\/jobs\/new"\)\}/);
 assert.match(nav,/permissions\.includes\(e\.permission\)/);
 assert.match(api,/role:member\.role,permissions/);
});

test("sidebar groups and links enforce vertical stacking despite inherited CSS",()=>{
 assert.match(css,/#bms-sidebar \.bms-nav-section\{display:block!important/);
 assert.match(css,/#bms-sidebar \.bms-nav-links\{display:flex!important;flex-direction:column!important/);
 assert.match(css,/#bms-sidebar \.bms-side-link\{display:flex!important;flex-direction:row!important/);
 assert.match(css,/#bms-sidebar \.bms-sidebar-scroll\{display:block!important/);
});
test("opening mobile hamburger expands every section even if previously collapsed",()=>{
 assert.match(nav,/Object\.fromEntries\(groups\.map\(g=>\[g\.name,true\]\)\)/);
 assert.match(nav,/mobileOpen\?openSections\[group\.name\]!==false/);
});

test("premium sidebar uses consistent vector icons and restrained neutral surfaces",()=>{
 assert.match(nav,/function NavIcon/);
 assert.match(nav,/strokeWidth="1\.75"/);
 assert.match(css,/Premium shared BMS navigation visual system/);
 assert.match(css,/background:#f8f9fb!important/);
 assert.match(css,/bms-side-active\{background:#fff1e7!important/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test("Worker Portal offers retry on failed authenticated load",()=>{
 const worker=fs.readFileSync("business-software-core/components/admin/WorkerPortal.tsx","utf8");
 assert.match(worker,/Your work records could not be loaded/);
 assert.match(worker,/Retry loading/);
 assert.match(worker,/setError\(""\)/);
});

test("Ruby uses the original portrait and remains visible in compact mobile header",()=>{
 assert.match(nav,/ruby-ai-business-assistant\.webp/);
 assert.match(css,/\.bms-ruby-avatar/);
 assert.match(css,/\.bms-header-new-job\{display:none!important/);
 assert.match(css,/\.bms-ruby-link\{min-height:40px!important;width:42px!important/);
});
test("dashboard New Job menu preserves both quick and full job workflows",()=>{
 const dashboard=fs.readFileSync("business-software-core/components/admin/CrmDashboardV3.tsx","utf8");
 const menu=fs.readFileSync("business-software-core/components/admin/NewJobMenu.tsx","utf8");
 const form=fs.readFileSync("business-software-core/components/admin/NewJobFormV2.tsx","utf8");
 assert.match(dashboard,/NewJobMenu accent=\{crmConfig\.accentColour\}/);
 assert.doesNotMatch(dashboard,/\+ Quick add job/);
 assert.match(menu,/Quick Add Job/);assert.match(menu,/Full Job/);
 assert.match(menu,/jobs\/new\?quick=1/);
 assert.match(form,/startsWith\("\/bms-runtime"\)/);
});
test("logout matches light navigation and exposes a visible keyboard focus state",()=>{
 assert.match(nav,/Sign out/);
 assert.match(css,/\.bms-logout\{min-height:42px!important/);
 assert.match(css,/\.bms-logout:focus-visible/);
});

test("New Job remains available from mobile drawer on permitted pages only",()=>{
 assert.match(nav,/bms-mobile-new-job/);
 assert.match(nav,/permissions\.includes\("edit_jobs"\)/);
 assert.match(css,/\.bms-mobile-new-job\{display:block!important/);
 assert.match(nav,/\{expanded&&<div className="bms-nav-links"/);
});
