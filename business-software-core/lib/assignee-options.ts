export type AssigneeOption={value:string;label:string};
const PLACEHOLDER=/^manager\s*\d+$/i;
export function deriveAssigneeOptions(input:{configManagers?:AssigneeOption[]|null;jobManagers?:AssigneeOption[]|null;current?:string|null}):{options:AssigneeOption[];defaultValue:string}{
  const map=new Map<string,string>();
  const configReal:AssigneeOption[]=[];
  for(const m of input.configManagers||[]){if(m&&m.value&&m.label&&!PLACEHOLDER.test(String(m.label))){map.set(String(m.value),String(m.label));configReal.push({value:String(m.value),label:String(m.label)});}}
  for(const m of input.jobManagers||[]){if(m&&m.value&&!map.has(String(m.value)))map.set(String(m.value),String(m.label||m.value));}
  const current=input.current?String(input.current):"";
  if(current&&!map.has(current))map.set(current,current);
  const list=[...map].map(([value,label])=>({value,label}));
  // Tenant-configured managers keep their configured order and first entry stays the default.
  if(configReal.length)return {options:list,defaultValue:configReal[0].value};
  // Labels learned only from existing jobs have no trustworthy order: nothing is pre-selected.
  return {options:[{value:"",label:"Unassigned"},...list],defaultValue:""};
}
export function resolveAssigneeValue(userChoice:string|undefined,defaultValue:string):string{return userChoice!==undefined?userChoice:defaultValue;}

// Legacy compatibility only: the live "mj-metal" tenant has no managers in settings and its form always offered Mark first. Remove once that tenant stores managers in settings.
const LEGACY_MJ_MANAGERS:AssigneeOption[]=[{value:"MD",label:"Mark"},{value:"JB",label:"Jonathan"}];
export function configManagersFor(tenantKey:string|undefined,managers:AssigneeOption[]|undefined):AssigneeOption[]{
  const real=(managers||[]).some(m=>m&&m.value&&m.label&&!PLACEHOLDER.test(String(m.label)));
  return !real&&tenantKey==="mj-metal"?LEGACY_MJ_MANAGERS:(managers||[]);
}
