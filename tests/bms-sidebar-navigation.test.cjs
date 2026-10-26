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
