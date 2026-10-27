import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import ts from "typescript";
const source=readFileSync(new URL("../business-software-core/lib/safe-csv.ts",import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};runInNewContext(js,{module:mod,exports:mod.exports,Math,Number,String});
const {safeCsvCell}=mod.exports;
test("ordinary CSV cell and double quotes",()=>{
 assert.equal(safeCsvCell("Normal worker"),'"Normal worker"');
 assert.equal(safeCsvCell('Worker "Example"'),'"Worker ""Example"""');
});
test("spreadsheet formula prefixes are escaped",()=>{
 for(const input of ["=HYPERLINK(\"https://bad.invalid\")","+SUM(1,2)","-1+2","@SUM(1,2)","  =1+2"])assert.equal(safeCsvCell(input),'"\''+input.replace(/"/g,'""')+'"');
});
test("empty and numeric cells remain valid",()=>{
 assert.equal(safeCsvCell(null),'""');
 assert.equal(safeCsvCell(12.5),'"12.5"');
});
