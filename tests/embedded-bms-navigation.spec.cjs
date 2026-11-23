const {test:baseTest,expect}=require("@playwright/test");
const {Admission}=require('./bms-release-admission.cjs');
const base=process.env.BMS_E2E_BASE_URL||'http://localhost:3000';
const origins=[new URL(base).origin];
const {reserve}=require('./bms-release-ledger.cjs');
if(!process.env.BMS_RUN_LEDGER||!process.env.BMS_RUN_ID)throw Error('Durable release ledger/run ID required');
baseTest.beforeAll(()=>reserve(process.env.BMS_RUN_LEDGER,process.env.BMS_RUN_ID,'browser'));
const admission=new Admission({origins,budgetPath:process.env.BMS_ADMISSION_REPORT});
baseTest.describe.configure({mode:'serial'});
baseTest.use({serviceWorkers:'block'});
const test=baseTest.extend({context:async({context},use)=>{
 const settle=await require('./bms-release-transport.cjs').attach(context,admission);
 try{await use(context)}finally{await settle()}
}});


// Run against a reachable deployment: BMS_E2E_BASE_URL=https://diamantsolutions.co.uk npx playwright test tests/embedded-bms-navigation.spec.cjs
test("embedded fictional navigation displays actual links and switches tenant",async({page})=>{
 const base=process.env.BMS_E2E_BASE_URL||"http://localhost:3000";
 await page.goto(base+"/software");
 const outer=page.frameLocator('iframe[src="/bms-demo"]');
 await expect(outer.getByText("Demo business:")).toHaveCount(0);
 const runtime=outer.frameLocator('iframe[title="Diamant Solutions Business Management Software demo"]');
 const nav=runtime.locator('nav[aria-label="Main navigation"]');
 await expect(nav.getByRole("link",{name:"Dashboard"})).toBeVisible({timeout:20000});
 await expect(runtime.getByText("DEMO MODE")).toBeVisible();
 await expect(runtime.getByText("View demo as")).toBeVisible();
 await expect(nav.getByRole("link",{name:"Customers"})).toBeVisible();
 await expect(nav.getByRole("link",{name:"Stock",exact:true})).toBeVisible();
 await expect(nav.getByRole("link",{name:"Purchasing"})).toBeVisible();
 await expect(nav.getByRole("link",{name:"Settings"})).toBeVisible();
 await runtime.getByRole("button",{name:"Flooring & Tiles"}).click();
 await expect(nav.getByRole("link",{name:"Dashboard"})).toBeVisible();
 await expect(runtime.locator(".bms-brand-link strong")).toContainText(/Flooring|Tiles/i);
 await expect(nav.getByRole("link",{name:"Orders",exact:true})).toBeVisible();
 await nav.getByRole("link",{name:"Stock",exact:true}).click();
 await expect(runtime.locator("body")).toContainText(/stock|inventory/i);
 await expect(nav.getByRole("link",{name:"Dashboard"})).toBeVisible();
});
test("embedded mobile navigation opens with real links",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto((process.env.BMS_E2E_BASE_URL||"http://localhost:3000")+"/software");
 const runtime=page.frameLocator('iframe[src="/bms-demo"]').frameLocator('iframe[title="Diamant Solutions Business Management Software demo"]');
 await runtime.getByRole("button",{name:"Open navigation"}).click();
 await expect(runtime.locator('nav[aria-label="Main navigation"]').getByRole("link",{name:"Dashboard"})).toBeVisible();
 await expect(runtime.getByText("DEMO MODE")).toBeVisible();
 await expect(runtime.getByText("View demo as")).toBeVisible();
 await runtime.getByRole("button",{name:"Electrician",exact:true}).click();
 await expect(runtime.locator(".bms-brand-link strong")).toContainText(/Electrician|Electrical/i);
 await expect(runtime.locator('nav[aria-label="Main navigation"]').getByRole("link",{name:"Dashboard"})).toBeVisible();
});
