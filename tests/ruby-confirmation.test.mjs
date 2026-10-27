import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
const source=readFileSync(new URL("../app/api/bms-live/[...path]/route.ts",import.meta.url),"utf8");
const sign=source.match(/function confirmationSig\([\s\S]*?(?=\nfunction capitaliseName)/)?.[0];
const verify=source.match(/function validConfirmation\([\s\S]*?(?=\nfunction safeRubyHistoryLinks)/)?.[0];
if(!sign||!verify)throw new Error("Ruby confirmation helpers not found in actual API source");
const js=ts.transpileModule(sign+"\n"+verify+"\nexports.sign=confirmationSig;exports.verify=validConfirmation;",{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const context={exports:{},crypto,Buffer,process:{env:{DS_INTEGRATION_ENCRYPTION_KEY:"fictional-test-secret"}}};
runInNewContext(js,context);
const {sign:signToken,verify:verifyToken}=context.exports;
test("Ruby confirmation is bound to both tenant and authenticated user",()=>{
 const action={kind:"send_invoice",job_reference:"DEMO-001",data:{invoice_id:"fictional-1"}};
 const token={...action,sig:signToken(action,"tenant-A","user-A")};
 assert.equal(verifyToken(token,"tenant-A","user-A"),true);
 assert.equal(verifyToken(token,"tenant-B","user-A"),false);
 assert.equal(verifyToken(token,"tenant-A","user-B"),false);
});
test("Ruby confirmation rejects modified invoice and unsigned request",()=>{
 const action={kind:"send_invoice",job_reference:"DEMO-001",data:{invoice_id:"fictional-1"}};
 const token={...action,sig:signToken(action,"tenant-A","user-A")};
 assert.equal(verifyToken({...token,data:{invoice_id:"fictional-2"}},"tenant-A","user-A"),false);
 assert.equal(verifyToken(action,"tenant-A","user-A"),false);
});
test("Ruby signing fails closed without a configured secret",()=>{
 const previous=context.process.env.DS_INTEGRATION_ENCRYPTION_KEY;
 context.process.env.DS_INTEGRATION_ENCRYPTION_KEY="";
 assert.throws(()=>signToken({kind:"test"},"tenant-A","user-A"));
 context.process.env.DS_INTEGRATION_ENCRYPTION_KEY=previous;
});
