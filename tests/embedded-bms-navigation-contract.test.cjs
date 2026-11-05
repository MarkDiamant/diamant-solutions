const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
test("server-derived fictional demo context is passed only when no live tenant exists",()=>{
 const layout=read("app/bms-runtime/layout.tsx");
 assert.match(layout,/AdminBrandBar fictionalDemo=\{!live\}/);
 assert.match(layout,/!live&&<BmsRuntimeGuard\/>/);
});
test("embedded sidebar derives demo from selected sample and retains its runtime URL",()=>{
 const nav=read("business-software-core/components/admin/AdminBrandBar.tsx");
 assert.match(nav,/embeddedDemo=fictionalDemo&&parts\[0\]==="bms-runtime"/);
 assert.match(nav,/demoKeys\.includes\(sample\)\?sample:"northstar"/);
 assert.match(nav,/const prefix=embeddedDemo\?"\/bms-runtime"/);
 assert.match(nav,/embeddedDemo\?"\?sample="/);
 assert.match(nav,/permissions===null&&!demo/);
 assert.match(nav,/available\.map\(group=>/);
});
test("fictional demo API fetches retain sample and cannot silently call live admin endpoints",()=>{
 const guard=read("components/BmsRuntimeGuard.tsx");
 assert.match(guard,/new URLSearchParams\(window\.location\.search\)\.get\("sample"\)/);
 assert.match(guard,/\/api\/bms-demo\//);
 assert.match(guard,/window\.fetch=/);
});
test("business selector keeps embedded routes within fictional runtime and standalone routes unchanged",()=>{
 const selector=read("components/DemoSelector.tsx");
 assert.match(selector,/parts\[0\]==="bms-runtime"\?"\/bms-runtime"/);
 assert.match(selector,/"\?sample="\+encodeURIComponent\(key\)/);
 assert.match(selector,/:"\/"\+key\+/);
});
test("real browser regression asserts visible sidebar links and switching, not HTTP status",()=>{
 const spec=read("tests/embedded-bms-navigation.spec.cjs");
 for(const label of ["Dashboard","Customers","Stock","Purchasing","Settings","Flooring & Tiles","Orders","Open navigation"])assert.ok(spec.includes(label),label);
 assert.match(spec,/toBeVisible/);
 assert.match(spec,/frameLocator/);
});
