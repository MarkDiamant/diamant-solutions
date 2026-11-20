// Job follow-up "Done": request parsing and persisted-result verification, shared by the route and the Tasks panel.
// Stages are exactly the active stages the database default table (bms_ensure_job_next_action) already knows.
// "No further follow-up needed" (no_followup) is an explicit, audited opt-out: the follow-up is recorded done and
// the job keeps its current stage and financial state, but no next reminder is scheduled until someone sets one
// or the stage changes (enforced by the bms_ensure_job_next_action trigger and bms_complete_job_followup).
const DONE_STAGES=[
 ["awaiting_customer","Awaiting customer","Follow up customer"],
 ["awaiting_information","Awaiting information","Follow up outstanding information"],
 ["interested_not_ready","Interested, not ready","Check customer readiness"],
 ["pricing_up","Pricing up","Prepare quote"],
 ["estimate_preparing","Preparing estimate","Prepare estimate"],
 ["quote_preparing","Preparing quote","Send quote"],
 ["quote_sent","Quote sent","Follow up quote"],
 ["site_visit_required","Site visit required","Arrange site visit"],
 ["site_visit_booked","Site visit booked","Complete site visit"],
 ["confirmed","Confirmed","Confirm deposit and schedule works"],
 ["deposit_requested","Deposit requested","Follow up deposit"],
 ["in_progress","In progress","Check progress and confirm next step"],
 ["on_hold","On hold","Review job on hold"]
];
function parseDoneRequest(b,now=Date.now()){
 if(b&&b.no_followup!==undefined&&typeof b.no_followup!=="boolean")return {ok:false,error:"Choose a valid follow-up option."};
 const noFollow=!!(b&&b.no_followup);
 const raw=b&&b.next_at?String(b.next_at):"";
 const stage=b&&b.new_status?String(b.new_status):null;
 if(noFollow){
  if(raw)return {ok:false,error:"Choose either a next follow-up date or no further follow-up."};
  if(stage)return {ok:false,error:"Choose either a new stage or no further follow-up."};
  return {ok:true,noFollowup:true,nextAt:null,newStatus:null};
 }
 if(!raw)return {ok:false,error:"Choose the next follow-up date."};
 const at=new Date(raw);
 if(Number.isNaN(at.getTime()))return {ok:false,error:"Choose a valid next follow-up date."};
 if(at.getTime()<=now)return {ok:false,error:"The next follow-up must be in the future."};
 if(stage&&!DONE_STAGES.some(s=>s[0]===stage))return {ok:false,error:"Choose a valid stage."};
 return {ok:true,noFollowup:false,nextAt:at.toISOString(),newStatus:stage};
}
function verifyDoneResponse(req,body,now=Date.now()){
 const fail=()=>({ok:false,error:"We couldn't confirm whether this saved."});
 const job=body&&body.job;
 if(!body||body.ok!==true||body.done!==true||!job)return fail();
 if(req&&req.no_followup){
  // The only acceptable persisted result: no next action, no date, and (when the field is returned) the
  // explicit persisted opt-out flag. A refilled action or date means the change did not stick.
  if(job.next_action!=null||job.next_action_at!=null)return fail();
  if(job.next_action_paused!==true)return fail();
  return {ok:true,at:null,action:null,noFollowup:true};
 }
 if(!job.next_action)return fail();
 const got=job.next_action_at?new Date(job.next_action_at).getTime():NaN,want=req&&req.next_at?new Date(req.next_at).getTime():NaN;
 if(!Number.isFinite(got)||!Number.isFinite(want)||got<=now||Math.abs(got-want)>1000)return fail();
 if(req.new_status){const s=DONE_STAGES.find(x=>x[0]===req.new_status);if(!s||job.status!==req.new_status||job.next_action!==s[2])return fail();}
 return {ok:true,at:job.next_action_at,action:job.next_action};
}
module.exports={DONE_STAGES,parseDoneRequest,verifyDoneResponse};
