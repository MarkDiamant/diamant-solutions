const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const api=fs.readFileSync("app/api/bms-live/[...path]/route.ts","utf8");
const ui=fs.readFileSync("business-software-core/components/admin/InvoicePrint.tsx","utf8");
const section=api.slice(api.indexOf('if(p==="invoices/update-notes")'),api.indexOf('if(p==="invoices/change-due-date")'));
test("invoice notes endpoint requires explicit confirmation and tenant ownership",()=>{assert.match(section,/b.confirm!==true/);assert.match(section,/tenant_id=eq/);assert.match(section,/view_payments_invoices/);assert.match(section,/edit_jobs/);assert.match(section,/notes.length>5000/);});
test("Xero invoices cannot be silently modified in local invoice notes",()=>{assert.match(section,/invoice.provider!=="bms"/);assert.match(section,/amended in Xero/);assert.doesNotMatch(section,/xeroRequest\(/);});
test("invoice notes persist only on the invoice and render in regenerated PDF",()=>{assert.match(section,/invoice_notes:value/);assert.match(ui,/Edit Invoice Notes/);assert.match(ui,/Save Invoice Notes/);assert.match(ui,/invoice\.invoice_notes&&<section/);assert.match(ui,/white-space|whitespace-pre-line/);assert.match(ui,/window.confirm\("Save invoice-specific notes/);});

test("invoice notes editor falls back to canonical BMS runtime endpoint",()=>{assert.match(ui,/r.status===404/);assert.match(ui,/\/api\/bms-live\/invoices\/update-notes/);});

test("invoice notes edits retain tenant-scoped previous and updated wording in audit history",()=>{assert.match(section,/business_software_audit_events/);assert.match(section,/invoice_notes_updated/);assert.match(section,/previous_notes/);assert.match(section,/updated_notes:value/);assert.match(section,/invoiceUpdated:true/);});
