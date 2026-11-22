export const LABOUR_REPORTING_DAY_HOURS = 8;
export type LabourEstimate = {id?:string; job_id:string; version:number; fabrication_hours:unknown; installation_hours:unknown; cost_budget?:unknown; reason?:string|null; approved_at?:string|null};
export type LabourActual = {job_id:string; actual_hours:unknown; actual_cost?:unknown; unpriced_hours?:unknown; fabrication_hours?:unknown; installation_hours?:unknown; travel_hours?:unknown};
export function recordedHours(value:unknown):number|null {
 if((typeof value!=="number"&&typeof value!=="string")||(typeof value==="string"&&!value.trim()))return null;
 const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;
}
export function estimateHours(estimate:LabourEstimate|undefined|null):number|null {
 if(!estimate)return null;const fabrication=recordedHours(estimate.fabrication_hours),installation=recordedHours(estimate.installation_hours);
 if(fabrication===null||installation===null)return null;const total=fabrication+installation;return Number.isFinite(total)?total:null;
}
export function labourTimeLabel(hours:number|null):string {
 return hours===null?"Not recorded":`${hours.toFixed(2)} hours / ${(hours/LABOUR_REPORTING_DAY_HOURS).toFixed(2)} days`;
}
export function compareJobLabour(budgets:LabourEstimate[],actual:LabourActual|undefined|null) {
 const versions=[...budgets].sort((a,b)=>Number(b.version)-Number(a.version));
 const latest=versions[0],original=versions.find(b=>Number(b.version)===1),baseline=original||latest;
 const planned=estimateHours(baseline),worked=actual?recordedHours(actual.actual_hours):null;
 return {versions,latest,original,baseline,planned,worked,difference:planned===null||worked===null?null:worked-planned};
}
