const {test}=require("node:test");const assert=require("node:assert/strict");const {verify}=require("../scripts/bms-deployment-parity-gate.cjs");
const good={id:"standalone",deploymentId:"dpl_1",gitSha:"abc",packageIntegrity:"sha512-test",sharedCoreVersion:"1.0.44",acceptance:"passed"};
test("reject stale M&J while standalone is current",()=>{const r=verify({tenants:[good,{...good,id:"mjmetal",sharedCoreVersion:"1.0.38"}]},"1.0.44");assert.equal(r.ok,false);assert.match(r.errors.join(" "),/mjmetal: deployed 1.0.38/)});
test("reject missing demo evidence and missing integrity",()=>{const r=verify({tenants:[good,{...good,id:"embedded-demo",packageIntegrity:"",acceptance:"pending"}]},"1.0.44");assert.equal(r.ok,false);assert.equal(r.errors.length,2)});
test("reject duplicate tenants and absent inventory",()=>{assert.throws(()=>verify({tenants:[]},"1.0.44"));assert.equal(verify({tenants:[good,good]},"1.0.44").ok,false)});
test("accept verified identical versions across all enumerated tenants",()=>{assert.equal(verify({tenants:[good,{...good,id:"mjmetal"},{...good,id:"embedded-demo"}]},"1.0.44").ok,true)});
