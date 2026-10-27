const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const job=fs.readFileSync('business-software-core/components/admin/JobDetail.tsx','utf8');
const grant=fs.readFileSync('supabase/migrations/20261027000100_bms_job_items_service_role_grants.sql','utf8');
test('job navigation precedes the job summary and split action is grouped',()=>{
 assert.ok(job.indexOf('<nav className="mt-5')<job.indexOf('aria-label="Job priorities"'));
 assert.match(job,/Job options and split order/);
});
test('overview retains sticky form submit without duplicate bottom submit',()=>{
 assert.match(job,/form="bms-job-overview-form"/);
 assert.equal((job.match(/\{saving\?"Saving job\.\.\.":"Save job"\}/g)||[]).length,0);
});
test('searching work types does not unmount checked inputs',()=>{
 assert.match(job,/type="search" placeholder="Search work types"/);
 assert.match(job,/workTypeOptions\.map/);
 assert.match(job,/!matchingWorkTypes\.includes\(x\)\?"hidden"/);
});
test('trusted service role can read and revise tenant-verified job items',()=>{
 assert.match(grant,/GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.business_software_job_items TO service_role/);
 assert.match(grant,/GRANT SELECT, INSERT ON TABLE public\.business_software_job_item_revisions TO service_role/);
});
