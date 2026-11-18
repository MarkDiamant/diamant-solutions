import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const rd=p=>readFileSync(new URL("../business-software-core/"+p,import.meta.url),"utf8");
const print=rd("components/admin/QuotePrint.tsx"),pdf=rd("components/admin/QuotePdfActions.tsx"),pres=rd("lib/presentation.ts");
test("both quote layouts mark the scope container so the PDF paginator sees its blocks",()=>{
  const scopes=[...print.matchAll(/<div[^>]*>\{renderQuoteScope\(/g)].map(m=>m[0]);
  assert.ok(scopes.length>=2);for(const s of scopes)assert.match(s,/data-quote-scope/);});
test("scope headings are emitted with data-quote-heading and the paginator treats them as headings",()=>{
  assert.match(pres,/data-quote-heading/);
  assert.match(pdf,/heading:[^\n]*hasAttribute\("data-quote-heading"\)/);});
test("paginator block selector reads direct children of the scope container",()=>{
  assert.match(pdf,/section \[data-quote-scope\] > div/);});
