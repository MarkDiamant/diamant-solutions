const {parseDoneRequest}=require('./job-followup.cjs');
const REMINDER_DAYS=[1,3,5,7,14,30];
// Translate one explicit UI choice to the existing API contract. Never infer a stage.
function completionRequest(choice,now=Date.now()){
 if(!choice)return {ok:false,error:'Choose what happens next.'};
 if(choice.intent==='later')return REMINDER_DAYS.includes(choice.days)?{ok:true,request:{snooze_days:choice.days}}:{ok:false,error:'Choose when to be reminded.'};
 if(choice.intent==='finish')return {ok:true,request:{status:'completed',no_followup:true}};
 if(!['followup','stage'].includes(choice.intent))return {ok:false,error:'Choose what happens next.'};
 if(choice.intent==='stage'&&choice.stage&&choice.stage===choice.currentStage)return {ok:false,error:'Choose a different stage, or add another reminder at the current stage.'};
 if(choice.intent==='stage'&&!choice.stage)return {ok:false,error:'Choose the next action and stage.'};
 const request={status:'completed',next_at:choice.at};
 if(choice.intent==='stage')request.new_status=choice.stage;
 const checked=parseDoneRequest(request,now);
 return checked.ok?{ok:true,request:{...request,next_at:checked.nextAt}}:checked;
}
module.exports={REMINDER_DAYS,completionRequest};
