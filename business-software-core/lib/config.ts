export type CrmModuleKey = "photos" | "workforce" | "commission" | "payments" | "costs" | "finishes" | "siteVisits" | "scheduling" | "quotes" | "invoices";

export type CrmConfig = {
  businessName: string;
  systemName: string;
  logoUrl: string;
  accentColour: string;
  workforceTitle: string;
  workforceSingular: string;
  workforceRoles: string[];
  managers: Array<{value:string;label:string}>;
  workTypes: string[];
  finishOptions: string[];
  enquirySources: string[];
  fileCategories: string[];
  quoteTemplate: "mj-signature" | "clean" | "classic";
  invoiceTemplate: "mj-signature" | "clean" | "classic";
  tenantKey: string;
  plan: { includedUsers:number; licensedUsers:number; additionalUserMonthly:number; aiAssistantMonthly:number; annualMonthsCharged:number; aiIncluded:boolean; };
  ai: { enabled:boolean; textAssist:boolean; voiceAssist:boolean; includedTextActions:number|null; includedVoiceMinutes:number|null; };
  billing: { mode:"free"|"paid"; interval:"monthly"|"annual"|null; status:"active"|"past_due"|"unpaid"|"cancelled"|"trialing"; resumeUrl:string; customerId:string; subscriptionId:string; currentPeriodEnd:string; cancelAtPeriodEnd:boolean; };
  businessDetails: { phone:string; email:string; website:string; companyNumber:string; officeAddress:string; registeredAddress:string; bankName:string; accountNumber:string; sortCode:string; vatRegistered:boolean; vatNumber:string; defaultDepositPercent:number; quoteValidityDays:number; paymentTerms:string; defaultVatRate:number; emailSignatureName:string; emailSignatureTagline:string; };
  modules: Record<CrmModuleKey, boolean>;
};

export const SHARED_BUSINESS_SOFTWARE_DEFAULTS: CrmConfig = {
  businessName:"Your Business", systemName:"Business Management Software", logoUrl:"/Icon-512.png", accentColour:"#e66a24",
  workforceTitle:"Team", workforceSingular:"team member", workforceRoles:["Engineer","Technician","Contractor","Subcontractor","Surveyor","Project manager","Electrician","Plumber","Carpenter","Builder","Cleaner","Driver","Consultant","Salesperson","Other"],
  managers:[{value:"M1",label:"Manager 1"}], workTypes:["Installation","Repair","Maintenance","Service","Survey","Consultation","Project","Other"], finishOptions:["Standard","Other"], enquirySources:["WhatsApp","Email","Website","Phone","Referral","Existing Customer","Other"], fileCategories:["Site Survey","Before","Drawing","Installation","After","Other"], quoteTemplate:"clean", invoiceTemplate:"clean", tenantKey:"demo",
  plan:{includedUsers:1,licensedUsers:1,additionalUserMonthly:10,aiAssistantMonthly:15,annualMonthsCharged:10,aiIncluded:false}, ai:{enabled:false,textAssist:false,voiceAssist:false,includedTextActions:null,includedVoiceMinutes:null}, billing:{mode:"free",interval:null,status:"active",resumeUrl:"",customerId:"",subscriptionId:"",currentPeriodEnd:"",cancelAtPeriodEnd:false},
  businessDetails:{phone:"",email:"",website:"",companyNumber:"",officeAddress:"",registeredAddress:"",bankName:"",accountNumber:"",sortCode:"",vatRegistered:false,vatNumber:"",defaultDepositPercent:50,quoteValidityDays:30,paymentTerms:"50% deposit, with the remaining balance due on completion.",defaultVatRate:20,emailSignatureName:"The Team",emailSignatureTagline:""},
  modules:{photos:true,workforce:true,commission:true,payments:true,costs:true,finishes:true,siteVisits:true,scheduling:true,quotes:true,invoices:true}
};
export const DEFAULT_CRM_CONFIG=SHARED_BUSINESS_SOFTWARE_DEFAULTS;

export function normaliseCrmConfig(value: Partial<CrmConfig> | null | undefined): CrmConfig {
  const tenantKey = value?.tenantKey || DEFAULT_CRM_CONFIG.tenantKey;
  const quoteTemplate = value?.quoteTemplate || DEFAULT_CRM_CONFIG.quoteTemplate;
  const invoiceTemplate = value?.invoiceTemplate === "mj-signature" && tenantKey !== "mj-metal" ? "clean" : (value?.invoiceTemplate || DEFAULT_CRM_CONFIG.invoiceTemplate);
  return {
    ...DEFAULT_CRM_CONFIG,
    ...(value || {}),
    tenantKey,
    quoteTemplate,
    invoiceTemplate,
    modules: { ...DEFAULT_CRM_CONFIG.modules, ...(value?.modules || {}) },
    businessDetails: { ...DEFAULT_CRM_CONFIG.businessDetails, ...(value?.businessDetails || {}) },
    plan: { ...DEFAULT_CRM_CONFIG.plan, ...(value?.plan || {}) },
    ai: { ...DEFAULT_CRM_CONFIG.ai, ...(value?.ai || {}) },
    billing: { ...DEFAULT_CRM_CONFIG.billing, ...(value?.billing || {}) },
    workTypes: Array.isArray(value?.workTypes) && value!.workTypes!.length ? value!.workTypes! : DEFAULT_CRM_CONFIG.workTypes,
    finishOptions: Array.isArray(value?.finishOptions) && value!.finishOptions!.length ? value!.finishOptions! : DEFAULT_CRM_CONFIG.finishOptions,
    enquirySources: Array.isArray(value?.enquirySources) && value!.enquirySources!.length ? value!.enquirySources! : DEFAULT_CRM_CONFIG.enquirySources,
    fileCategories: Array.isArray(value?.fileCategories) && value!.fileCategories!.length ? value!.fileCategories! : DEFAULT_CRM_CONFIG.fileCategories,
    managers: Array.isArray(value?.managers) && value!.managers!.length ? value!.managers! : DEFAULT_CRM_CONFIG.managers,
    workforceRoles: Array.isArray(value?.workforceRoles) && value!.workforceRoles!.length ? value!.workforceRoles! : DEFAULT_CRM_CONFIG.workforceRoles,
  };
}
