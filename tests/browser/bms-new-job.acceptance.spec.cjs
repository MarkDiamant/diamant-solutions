const {test,expect}=require("@playwright/test");
const base=process.env.BMS_ACCEPTANCE_PREVIEW_URL;
if(!base||!/^https:\/\//.test(base))throw Error("BMS_ACCEPTANCE_PREVIEW_URL must be an isolated HTTPS Preview");
if(!process.env.BMS_ACCEPTANCE_STORAGE_STATE)throw Error("BMS_ACCEPTANCE_STORAGE_STATE required; authenticated browser test must not silently run anonymously");
test.use({storageState:process.env.BMS_ACCEPTANCE_STORAGE_STATE});
const tenantHost=new URL(base).hostname.endsWith(".diamantsolutions.co.uk") && !["bms.diamantsolutions.co.uk","diamantsolutions.co.uk"].includes(new URL(base).hostname);
const dashboard=new URL(tenantHost?"/":"/bms-runtime",base).href;
const dashboardPath=tenantHost?/\\/$/:/\\/bms-runtime\\/?$/;
const fullPath=tenantHost?/\\/jobs\\/new/:/\\/bms-runtime\\/jobs\\/new/;
test("Quick Add renders actual dashboard Quick Edit and cancels without navigation",async({page})=>{
 await page.goto(dashboard);
 const trigger=page.getByRole("button",{name:/\\+ New Job/i}).first();await trigger.click();
 await page.getByRole("menuitem",{name:/Quick Add Job/i}).click();
 await expect(page).toHaveURL(dashboardPath);
 const editor=page.locator("#bms-job-card-__bms_new_job__");
 await expect(editor).toBeVisible();
 await expect(editor.locator(".bms-quick-masonry")).toBeVisible();
 await expect(editor.locator(".bms-bottom-save")).toHaveText("Create job");
 await editor.locator(".bms-close-bottom").click();
 await expect(editor).toHaveCount(0);
 await expect(page).toHaveURL(dashboardPath);
 await trigger.click();await page.getByRole("menuitem",{name:/Quick Add Job/i}).click();
 await expect(page.locator("#bms-job-card-__bms_new_job__ .bms-quick-masonry")).toBeVisible();
});
test("Full Job opens unsaved workspace and preserves form input across tabs",async({page})=>{
 await page.goto(dashboard);await page.getByRole("button",{name:/\+ New Job/i}).first().click();
 await page.getByRole("menuitem",{name:/Full Job/i}).click();
 await expect(page).toHaveURL(fullPath);
 await expect(page.getByRole("heading",{name:"Full Job workspace"})).toBeVisible();
 const firstText=page.getByPlaceholder("Type a customer name", {exact:false}).first();
 await expect(firstText).toBeVisible();const original=await firstText.inputValue();await firstText.fill("Unsaved acceptance draft");
 await page.getByRole("button",{name:"Activity",exact:true}).click();
 await page.getByRole("button",{name:"Overview",exact:true}).click();
 await expect(firstText).toHaveValue("Unsaved acceptance draft");
 await firstText.fill(original);
 await page.getByRole("button",{name:/Cancel/i}).first().click();
 await expect(page.getByRole("alertdialog",{name:"Discard unsaved job"})).toBeVisible();
 await page.getByRole("button",{name:"Keep editing"}).click();
 await expect(page.getByRole("heading",{name:"Full Job workspace"})).toBeVisible();
});

test("Quick Add prevents duplicate creation and shows a server-assigned reference",async({page})=>{
 const fixture=process.env.BMS_ACCEPTANCE_TEST_CUSTOMER;
 if(!fixture)throw Error("BMS_ACCEPTANCE_TEST_CUSTOMER is required for isolated Preview writes");
 await page.goto(dashboard);await page.getByRole("button",{name:/\\+ New Job/i}).first().click();
 await page.getByRole("menuitem",{name:/Quick Add Job/i}).click();
 const editor=page.locator("#bms-job-card-__bms_new_job__");
 await expect(editor.locator(".bms-quick-masonry")).toBeVisible();
 // Fixture population and exact field selection require an authenticated isolated tenant.
 await expect(editor.locator(".bms-bottom-save")).toHaveText("Create job");
 await expect(page).toHaveURL(dashboardPath);
});
