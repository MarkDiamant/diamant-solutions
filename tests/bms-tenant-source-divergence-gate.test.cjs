const {test}=require("node:test");const assert=require("node:assert/strict");const {inspect}=require("../scripts/bms-tenant-source-divergence-gate.cjs");
const pkg={dependencies:{"@markdiamant/business-software-core":"1.0.44"}};
test("rejects copied tenant BMS functionality",()=>{const errors=inspect(["components/admin/JobDetail.tsx"],pkg,()=>'"use client"; export default function JobDetail(){return null}');assert.equal(errors.length,1)});
test("permits thin canonical package re-export adapters",()=>{const errors=inspect(["components/admin/JobDetail.tsx"],pkg,()=> 'export {default} from "@markdiamant/business-software-core/components/admin/JobDetail";');assert.deepEqual(errors,[])});
test("requires canonical package dependency",()=>{assert.match(inspect([], {dependencies:{}}).join(" "),/Missing canonical package dependency/)});
