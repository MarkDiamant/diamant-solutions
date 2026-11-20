const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {completionRequest,REMINDER_DAYS}=require('../business-software-core/lib/task-completion.cjs');
const {DONE_STAGES,parseDoneRequest}=require('../business-software-core/lib/job-followup.cjs');
const NOW=Date.parse('2026-11-20T13:00:00Z'),future='2026-11-24T09:00:00Z';
test('no default intent, stage, date or delay',()=>{
 for(const c of [undefined,{}, {intent:'stage'},{intent:'followup'},{intent:'later'}])assert.equal(completionRequest(c,NOW).ok,false);
});
test('finish explicitly opts out and discards stale hidden stage/date/delay values',()=>{
 const r=completionRequest({intent:'finish',stage:'quote_sent',at:future,days:3},NOW);
 assert.deepEqual(r,{ok:true,request:{status:'completed',no_followup:true}});
 assert.equal(parseDoneRequest(r.request,NOW).ok,true);
});
test('remind later never completes the reminder or changes the stage',()=>{
 for(const days of REMINDER_DAYS)assert.deepEqual(completionRequest({intent:'later',days,stage:'quote_preparing',at:future},NOW),{ok:true,request:{snooze_days:days}});
 for(const days of [-1,0,2,365,'3',null,NaN])assert.equal(completionRequest({intent:'later',days},NOW).ok,false);
});
test('same-stage next reminder ignores hidden stage and keeps required future date',()=>{
 assert.deepEqual(completionRequest({intent:'followup',at:future,stage:'quote_sent'},NOW),{ok:true,request:{status:'completed',next_at:future.replace('Z','.000Z')}});
 for(const at of ['', 'bad','2026-11-20T13:00:00Z','2026-11-19T10:00:00Z'])assert.equal(completionRequest({intent:'followup',at},NOW).ok,false);
});
test('only explicitly chosen supported new stages can progress the job',()=>{
 for(const [stage] of DONE_STAGES){const r=completionRequest({intent:'stage',stage,at:future,currentStage:'new_enquiry'},NOW);assert.equal(r.ok,true);assert.equal(r.request.new_status,stage);assert.equal(parseDoneRequest(r.request,NOW).ok,true)}
 for(const stage of ['','completed','lost','fake'])assert.equal(completionRequest({intent:'stage',stage,at:future},NOW).ok,false);
 assert.equal(completionRequest({intent:'stage',stage:'quote_preparing',currentStage:'quote_preparing',at:future},NOW).ok,false);
});
test('dialog has labelled choices, exact action preview, focus and overflow support',()=>{
 const s=fs.readFileSync('business-software-core/components/admin/JobFollowupDialog.tsx','utf8');
 for(const text of ['role="dialog"','aria-modal="true"','aria-labelledby="followup-title"','aria-describedby="followup-description"','type="radio"','<legend','max-h-[92dvh]','overflow-y-auto','document.activeElement','e.key==="Escape"','e.key==="Tab"','document.body.style.overflow="hidden"','Next action:','{chosen[2]}','No message or quote is sent','disabled={!result.ok||busy}'])assert.ok(s.includes(text),text);
 assert.match(s,/useState\(""\)/,'no preselected intent');
 assert.match(s,/disabled=\{key===task\?\.job_status\}/,'same-stage is not a progression choice');
});
test('TasksPanel preserves direct ordinary-task verification and job persisted-result verification',()=>{
 const s=fs.readFileSync('business-software-core/components/admin/TasksPanel.tsx','utf8');
 for(const text of ['verifyDoneResponse(p,b)','checked?.task?.status!=="completed"','Unable to confirm update:','reloaded=await load()','if(updating===id)return;setDoneFor','<JobFollowupDialog','Complete occurrence','Complete task','Linked job unchanged.','Remind later'])assert.ok(s.includes(text),text);
 assert.doesNotMatch(s,/nextJobStep\(/);
});

test('success confirmation is content-sized, centred and expires after ten seconds without hiding errors',()=>{
 const s=fs.readFileSync('business-software-core/components/admin/TasksPanel.tsx','utf8');
 assert.match(s,/window\.setTimeout\(\(\)=>setDoneNote\(""\),10000\)/);
 assert(s.includes('setDoneNoteVersion(v=>v+1)'));assert(s.includes('window.clearTimeout(timer)'));
 const toast=s.slice(s.indexOf('{doneNote&&'),s.indexOf('{doneFor&&'));
 assert(toast.includes('w-max'));assert(toast.includes('left-1/2'));assert(toast.includes('text-center'));assert(!toast.includes('Dismiss'));assert(!toast.includes('w-[92vw]'));
 assert(s.includes('role="alertdialog"'));assert(s.includes('onClick={()=>setErr("")}'));assert(!s.includes('setTimeout(()=>setErr('));
});
