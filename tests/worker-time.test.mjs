import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import ts from "typescript";
const source=readFileSync(new URL("../business-software-core/lib/worker-time.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
runInNewContext(compiled,{module:mod,exports:mod.exports,Date,Math,Number});
const {hoursOnLocalDay}=mod.exports;
test("normal same-day time",()=>assert.equal(hoursOnLocalDay("2026-10-27T09:00:00Z","2026-10-27T11:00:00Z",new Date("2026-10-27T12:00:00Z")),2));
test("overnight time is counted only on its overlapping day",()=>{
 const from="2026-10-26T23:00:00Z",to="2026-10-27T01:00:00Z";
 assert.equal(hoursOnLocalDay(from,to,new Date("2026-10-26T12:00:00Z")),1);
 assert.equal(hoursOnLocalDay(from,to,new Date("2026-10-27T12:00:00Z")),1);
});
test("spring DST day is 23 elapsed hours",()=>assert.equal(hoursOnLocalDay("2026-03-29T00:00:00Z","2026-03-29T23:00:00Z",new Date("2026-03-29T12:00:00Z")),23));
test("autumn DST day is 25 elapsed hours",()=>assert.equal(hoursOnLocalDay("2026-10-24T23:00:00Z","2026-10-26T00:00:00Z",new Date("2026-10-25T12:00:00Z")),25));
test("invalid or negative intervals are ignored",()=>{assert.equal(hoursOnLocalDay("bad","2026-10-27T12:00:00Z"),0);assert.equal(hoursOnLocalDay("2026-10-27T12:00:00Z","2026-10-27T10:00:00Z"),0)});
