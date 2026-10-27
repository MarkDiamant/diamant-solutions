import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";
const require=createRequire(import.meta.url);
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const source=readFileSync(new URL("../business-software-core/components/admin/BmsUI.tsx",import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const mod={exports:{}};new Function("require","module","exports",js)(require,mod,mod.exports);
const UI=mod.exports;
const e=React.createElement;
test("shared BMS primitives render semantic page, heading, card, form, controls and table",()=>{
 const html=renderToStaticMarkup(e(UI.BmsPage,{id:"test-page"},e(UI.BmsPageHeader,null,e(UI.BmsPageTitle,null,"BMS acceptance")),e(UI.BmsCard,null,e(UI.BmsField,null,"Name",e(UI.BmsInput,{name:"customer",required:true})),e(UI.BmsSelect,{name:"category"},e("option",{value:"a"},"A")),e(UI.BmsTextarea,{name:"notes"}),e(UI.BmsButton,{type:"submit"},"Save"),e(UI.BmsTable,null,e("tbody",null,e("tr",null,e("td",null,"Data")))),e(UI.BmsBadge,{tone:"success"},"Complete"))));
 for(const part of ['<main','class="bms-page','<header','<h1','class="bms-card','<label','class="bms-input','<select','class="bms-select','<textarea','class="bms-textarea','type="submit"','class="bms-table-scroll"','<table','class="bms-badge bms-badge-success'])assert.ok(html.includes(part),part);
});
test("modal exposes dialog semantics and close control",()=>{
 const html=renderToStaticMarkup(e(UI.BmsModal,{title:"Edit customer",onClose:()=>{}},e(UI.BmsInput,{name:"name"})));
 for(const part of ['role="dialog"','aria-modal="true"','aria-label="Edit customer"','aria-label="Close dialog"','class="bms-modal-backdrop"'])assert.ok(html.includes(part),part);
});
test("state and button variants preserve error semantics and explicit type",()=>{
 const html=renderToStaticMarkup(e("div",null,e(UI.BmsState,{kind:"error"},"Unavailable"),e(UI.BmsButton,{variant:"danger",disabled:true},"Reset"),e(UI.BmsButton,{variant:"secondary"},"Cancel")));
 assert.ok(html.includes('role="alert"'));
 assert.ok(html.includes('bms-danger-button'));
 assert.ok(html.includes('disabled=""'));
 assert.ok(html.includes('bms-secondary-button'));
 assert.ok(html.includes('type="button"'));
});
