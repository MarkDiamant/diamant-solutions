const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const job=fs.readFileSync('business-software-core/components/admin/JobDetail.tsx','utf8');
const grant=fs.readFileSync('supabase/migrations/20261027000100_bms_job_items_service_role_grants.sql','utf8');
test('navigation precedes priorities and Split Job Order is a permission-gated tab',()=>{
 assert.ok(job.indexOf('aria-label="Job sections"')<job.indexOf('aria-label="Job priorities"'));
 assert.match(job,/"Split Job\/Order"/);
 assert.match(job,/x!=="Split Job\/Order"\|\|canPricing/);
 assert.match(job,/tab==="Split Job\/Order"&&canPricing/);
 assert.doesNotMatch(job,/Job options and split order/);
});
test('header has no activity, quote or invoice action shortcuts',()=>{
 const header=job.slice(job.indexOf('<header className='),job.indexOf('</header>')+9);
 assert.doesNotMatch(header,/chooseTab\("Activity"\)|chooseTab\("Quote"\)|chooseTab\("Invoice"\)/);
});
test('overview retains exactly one sticky Save job submit',()=>{
 assert.equal((job.match(/form="bms-job-overview-form"/g)||[]).length,1);
 assert.equal((job.match(/form="bms-job-overview-form"/g)||[]).length,1);
});
test('searchable multiselect retains selections while filtering and supports job-specific additions',()=>{
 assert.match(job,/function WorkTypePicker/);
 assert.match(job,/selected\.map\(x=><input key=\{x\} type="hidden" name="job_type"/);
 assert.match(job,/choices\.map\(x=><label/);
 assert.match(job,/checked=\{selected\.includes\(x\)\}/);
 assert.match(job,/Manage tenant-wide work types in Settings/);
});
test('quick edit remains open when save fails and advanced Job Options are grouped',()=>{
 assert.match(job,/if\(ok\)setQuickOpen\(false\)/);
 assert.match(job,/Job Options: site, scheduling and remedial work/);
});
test('trusted service role can read and revise tenant-verified job items',()=>{
 assert.match(grant,/GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.business_software_job_items TO service_role/);
 assert.match(grant,/GRANT SELECT, INSERT ON TABLE public\.business_software_job_item_revisions TO service_role/);
});

test('historical Xero-paid entries without payment dates are visibly flagged, not silently certified',()=>{
 assert.match(job,/payment_type==="historical_xero_paid"&&!p\.paid_at/);
 assert.match(job,/Payment evidence needs verification/);
 assert.match(job,/Verify against the actual Xero transaction/);
});

test("secondary job tabs show skeleton and split waits for full data",()=>{
 assert.match(job,/aria-label="Loading job section"/);
 assert.match(job,/data\._full&&tab==="Split Job\/Order"&&canPricing/);
});

test("Quick Edit cancel restores persisted job fields and refresh resynchronises",()=>{assert.match(job,/Cancel Quick Edit/);assert.match(job,/if\(quickOpen\)\{setQuickTitle/);assert.match(job,/\[j\.job_title,j\.job_type,j\.manager,j\.next_action,j\.next_action_at,j\.internal_notes,quickOpen\]/);});

test("activity submission retains entered data when server rejects save",()=>{assert.match(job,/const form=e\.currentTarget;try\{await onAction\(\{type:"activity"/);assert.match(job,/form\.reset\(\);\}catch\(error\)/);});

test("historical manager assignments remain selectable and quote/invoice notes are not conflated",()=>{assert.match(job,/Previously assigned \(configure name in Settings\)/);assert.match(job,/Customer requirements for quotation/);assert.match(job,/Quote Notes \/ exclusions \(shown on quotation only\)/);assert.match(job,/Invoice-specific wording belongs to the individual invoice/);});

test("work type multiselect rejects accidental zero selections rather than restoring stale types",()=>{assert.match(job,/if\(types\.length===0\)\{alert\("Choose at least one work type before saving this job\."\);return;\}/);assert.match(job,/job_type:types\[0\],job_types:types/);});

test("failed full job load preserves core job and exposes retry rather than infinite skeleton",()=>{assert.match(job,/const \[fullError,setFullError\]=useState\(""/);assert.match(job,/setFullError\(body\.error\|\|"Could not load complete job details"\)/);assert.match(job,/Retry full job details/);assert.match(job,/!data\._full&&!fullError&&<section/);});

test("mobile save dock has bottom clearance and work type selections do not overflow",()=>{assert.match(job,/pb-28 pt-5 sm:px-5 sm:pb-32/);assert.match(job,/fixed bottom-3 left-3 right-3/);assert.match(job,/min-w-0 truncate/);});

test("activity form prevents duplicate saves and indicates pending state",()=>{assert.match(job,/if\(submitting\)return/);assert.match(job,/finally\{setSubmitting\(false\)\}/);assert.match(job,/disabled=\{submitting\}>\{submitting\?"Saving activity\.\.\.":"Log activity"\}/);});
