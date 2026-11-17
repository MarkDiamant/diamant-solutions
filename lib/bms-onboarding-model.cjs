const baseSteps=[
 {title:'Your business',fields:[['businessName','Business name'],['contactName','Your name'],['email','Email address'],['phone','Phone number'],['website','Website (if you have one)']]},
 {title:'What you do',fields:[['businessType','What does your business do?'],['workName','What do you call your work? (Jobs, Projects, Cases, Orders...)'],['workflow','Briefly describe what normally happens from a new enquiry through to completion.'],['prospects','Do you track potential customers or sales opportunities before they become jobs? If so, what stages do you use?']]},
 {title:'What you need',fields:[['features','What would you like to manage in the system? (Customers, jobs, quotes, invoices, payments, files, team or anything else)'],['optionalModules','Which functions should appear in your menus? Select what you use now. You can enable more later.'],['statuses','What stages or statuses do you currently use for enquiries and jobs?'],['tasks','What tasks or to-do items do you need to track, and should they be linked to particular jobs or customers?'],['followups','How do you currently manage follow-ups, reminders and due dates? Who should be responsible for them?'],['users','How many people will use the system?'],['roles','Do different staff need different access?']]},
 {title:'Documents & money',fields:[['quotes','How do you currently handle quotes?'],['invoices','How do you currently handle invoices and payments?'],['existingData','Do you have existing customers, prospects, jobs or other records to import? If so, where are they kept (for example, spreadsheets or another system)?'],['files','What files, photos or documents do you need to keep?'],['integrations','Any software you would like connected?']]},
 {title:'Branding & extras',fields:[['logo','Your logo'],['colours','Brand colours (if known)'],['terminology','Any other wording you use instead of standard terms?'],['dashboard','What would you most like to see on your dashboard?'],['automation','Are there routine actions, task reminders or follow-ups you would like the system to handle?'],['anythingElse','Anything else we should know?']]}
];
const requiredKeys=['businessName','contactName','email','phone','businessType','workflow','features','users'];
const moduleGroups={
 'Sales & customers':['Prospects','Customers','Customer-specific pricing','Quotes','Sales orders','Deliveries','Returns'],
 'Operations':['Jobs','Tasks','Scheduling','Files','Campaigns'],
 'Products & stock':['Price book','Purchasing','Inventory','Goods received','Job allocations'],
 'People':['Workforce','Timesheets','Labour costing'],
 'Finance':['Invoices','Payments','Job finances','Money overview'],
 'Integrations':['Xero','Ruby AI']
};
const optionalFeatureOptions=Object.values(moduleGroups).flat();
const details=[
 {title:'Your team & permissions',module:'Workforce',fields:[['staffStructure','Who manages the business and who needs access? Include job titles, not passwords.'],['permissionsPolicy','Who should see financial information, approve quotes and manage staff?'],['labourRates','How do you calculate labour costs and staff rates?'],['timesheetRules','Do you track timesheets, hours, overtime or work by job?']]},
 {title:'Products & customer prices',module:'Price book',fields:[['productTypes','What products, variants, sizes and units do you sell?'],['priceRules','Do customers have agreed product prices or discounts? How are they recorded?'],['catalogueImport','Do you have a product price list or spreadsheet to import?'],['productCosting','How do you record product costs, VAT and selling prices?']]},
 {title:'Purchasing & suppliers',module:'Purchasing',fields:[['suppliersSetup','Which suppliers do you use and how do you place purchase orders?'],['purchaseApproval','Who may order goods and approve purchases?'],['goodsReceiving','Who records goods received, shortages and partial deliveries?']]},
 {title:'Warehouses & stock',module:'Inventory',fields:[['locationsSetup','Where do you store stock? Which location should be the default?'],['stockOpening','Do you have opening stock quantities and verified purchase costs to import?'],['stockAllocation','Do you reserve stock for jobs or orders, and can items be returned unused?'],['stockMovements','How do you handle transfers, adjustments and damaged stock?']]},
 {title:'Orders, deliveries & returns',module:'Sales orders',fields:[['orderWorkflow','How are orders approved, picked and completed?'],['deliveryWorkflow','Do you deliver, arrange collections or use external couriers?'],['returnsWorkflow','How are customer returns and unused job materials checked and handled?']]},
 {title:'Jobs, tasks & scheduling',module:'Jobs',fields:[['jobStages','What are your job stages, approvals and completion rules?'],['jobScheduling','How are visits, work and staff scheduled?'],['jobMaterials','Do jobs need materials, stock reservations or purchasing?'],['jobCostReview','Who reviews job profitability and cost overruns?']]},
 {title:'Accounts & reporting',module:'Invoices',fields:[['vatSettings','Are you VAT registered, and what VAT rates or exemptions apply?'],['invoiceSettings','What invoice numbering, payment terms and bank details should appear?'],['paymentTracking','How do you record deposits, part payments, refunds and outstanding balances?'],['financialReports','What financial figures should appear on your dashboard and job reports?']]},
 {title:'Connections & communication',module:'Xero',fields:[['xeroSetup','Do you use Xero? Which accounting workflows should synchronise after authorisation?'],['customerComms','Which customer communications and campaign tools do you use?'],['rubyPreferences','Would you like Ruby AI enabled, and who may use it?'],['notificationRules','Which notifications, reminders and approvals are important?']]},
 {title:'Data import & final preferences',module:null,fields:[['customerImport','Do you have customer, supplier or prospect data to import?'],['historicJobs','Do you need previous jobs, quotes, orders or invoices imported?'],['importSource','Where is the existing data stored, and who can approve its import?'],['businessDefaults','Any default locations, units, statuses, terms or business-specific preferences?'],['setupApprover','Who in your business should approve the configured system before launch?']]}
];
const moduleSelected=(data,name)=>{const chosen=Array.isArray(data.optionalModules)?data.optionalModules:[];return chosen.includes(name)||({Workforce:['Timesheets','Labour costing'], 'Price book':['Customer-specific pricing'],'Purchasing':['Goods received'],'Inventory':['Job allocations','Goods received'],'Sales orders':['Deliveries','Returns'],Jobs:['Tasks','Scheduling'],'Invoices':['Payments','Job finances','Money overview'],Xero:['Xero','Ruby AI','Campaigns']})[name]?.some(x=>chosen.includes(x))};


const optionalQuestions=new Set(['logo','website','colours','optionalModules']);
const questionnaireSteps=data=>[...baseSteps,...details.filter(x=>!x.module||data.moduleDecision==='help'||moduleSelected(data,x.module))];
function reviewNeeds(data){
 const needs=questionnaireSteps(data).flatMap(section=>section.fields.filter(([key])=>String(data[key]||'').trim().toLowerCase()==='discuss during setup').map(([key,label])=>({key,label})));
 if(data.moduleDecision==='help')needs.unshift({key:'optionalModules',label:'Agree which modules to enable'});
 return needs;
}
function completion(data){
 const steps=questionnaireSteps(data),missing=[];
 if(!['selected','none','help'].includes(data.moduleDecision)||(data.moduleDecision==='selected'&&(!Array.isArray(data.optionalModules)||!data.optionalModules.length)))missing.push({key:'optionalModules',page:2,label:'Choose your modules, none, or help choosing'});
 for(const [page,section] of steps.entries())for(const [key,label] of section.fields){
  if(!optionalQuestions.has(key)&&!String(data[key]||'').trim())missing.push({key,page,label});
 }
 if(!Number.isInteger(Number(data.users))||Number(data.users)<1||Number(data.users)>50)missing.push({key:'users',page:2,label:'Enter between 1 and 50 intended users'});
 const completePages=steps.map((x,i)=>i).filter(i=>!missing.some(m=>m.page===i));
 return {steps,missing,completePages,progress:Math.round(completePages.length/steps.length*100),finalStep:steps.length-1};
}
module.exports={baseSteps,details,requiredKeys,moduleGroups,optionalFeatureOptions,moduleSelected,questionnaireSteps,completion,reviewNeeds};
