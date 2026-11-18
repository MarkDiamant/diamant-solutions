'use strict';
// Single source of truth for the v2 proposed BMS configuration. Used by the
// client submission route and by the internal draft workflow when normalising a
// legacy (pre-v2) submission from its stored answers. Both callers must produce
// identical output for the same answers; the original submission row is never
// rewritten by the draft workflow.
const onboardingModel=require('./bms-onboarding-model.cjs');
const moduleNames=['Prospects','Customers','Customer-specific pricing','Quotes','Sales orders','Deliveries','Returns','Jobs','Tasks','Scheduling','Files','Campaigns','Price book','Purchasing','Inventory','Goods received','Job allocations','Workforce','Timesheets','Labour costing','Invoices','Payments','Job finances','Money overview','Xero','Ruby AI'];
function buildProposedConfig({answers,planSelection,logoPath}){
 const questionnaire=onboardingModel.completion(answers);
 const selectedModules=Array.isArray(answers.optionalModules)?[...new Set(answers.optionalModules.filter(x=>moduleNames.includes(x)))]:[];
 return {
  version:2,reviewRequired:true,approved:false,seatReview:{requestedUsers:Number(answers.users),recordedPlanUsers:Number(planSelection?.users)||null,required:Number(answers.users)!==Number(planSelection?.users)},modules:{enabled:selectedModules,hidden:moduleNames.filter(x=>!selectedModules.includes(x))},
  completion:{version:1,pageCount:questionnaire.steps.length,completedPages:questionnaire.completePages,moduleDecision:answers.moduleDecision,needsClarification:onboardingModel.reviewNeeds(answers).length>0,unresolvedQuestions:onboardingModel.reviewNeeds(answers)},
  business:{name:String(answers.businessName||'').trim(),type:String(answers.businessType||''),terminology:String(answers.terminology||answers.workName||''),branding:{colours:String(answers.colours||''),logoPath:logoPath||null}},
  tasks:[
   ...onboardingModel.reviewNeeds(answers).map(x=>({key:'clarify_'+x.key,label:'Resolve before configuration: '+x.label,status:'pending'})),
   {key:'verify_subscription',label:'Verify paid subscription and user seats',status:'pending'},
   {key:'review_branding',label:'Approve branding and business terminology',status:'pending'},
   {key:'configure_modules',label:'Review module visibility, permissions and dependencies',status:'pending'},
   {key:'configure_workflows',label:'Configure jobs, quotes, tasks and business workflows',status:'pending'},
   {key:'configure_finance',label:'Review VAT, invoices, payment terms and reporting',status:'pending'},
   ...(selectedModules.some(x=>['Inventory','Purchasing','Goods received','Job allocations'].includes(x))?[{key:'configure_stock',label:'Approve warehouses, stock costs and purchasing defaults',status:'pending'}]:[]),
   ...(selectedModules.some(x=>['Workforce','Timesheets','Labour costing'].includes(x))?[{key:'configure_workforce',label:'Review staff roles, rates and timesheets',status:'pending'}]:[]),
   ...(selectedModules.includes('Xero')?[{key:'authorise_xero',label:'Customer authorisation required for Xero',status:'pending'}]:[]),
   {key:'review_imports',label:'Review and approve any data imports',status:'pending'},
   {key:'client_approval',label:'Obtain customer approval of configured BMS',status:'pending'},
   {key:'activate',label:'Final internal approval before customer access',status:'pending'}
  ]
 };
}
module.exports={buildProposedConfig,moduleNames};
