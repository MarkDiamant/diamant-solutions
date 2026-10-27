import {test,expect,type BrowserContext} from "@playwright/test";
const base=process.env.BMS_TEST_BASE_URL||"https://bms.diamantsolutions.co.uk";
const token=process.env.BMS_TEST_ACCESS_TOKEN||"";
const mutate=process.env.BMS_RUN_MUTATIONS==="1";
async function auth(context:BrowserContext){
 if(!token)throw Error("BMS_TEST_ACCESS_TOKEN not configured");
 await context.addCookies([{name:"bms_access_token",value:token,url:base,httpOnly:true,secure:true,sameSite:"Lax"}]);
}
test("public fictional catalogue and coverage data",async({request})=>{
 const r=await request.get("/api/bms-demo/flooring-data");expect(r.status()).toBe(200);
 const d=await r.json();expect(d.products.length).toBeGreaterThan(0);
 expect(d.products.some((p:any)=>Number(p.units_per_pack)>0)).toBe(true);
 expect(d.customers.length).toBeGreaterThan(0);
});
test("anonymous mutations rejected",async({request})=>{
 const r=await request.post("/api/bms-demo/flooring-actions",{data:{action:"reset_demo",confirm_phrase:"RESET OAK AND STONE DEMO",request_key:"test-anonymous-reject-001"}});
 expect(r.status()).toBe(403);
});
test("authenticated manager desktop and mobile rendering",async({page,context})=>{
 test.skip(!token,"Requires an active dedicated manager test token");
 await auth(context);
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:850});await page.goto("/flooring/operations");
  await expect(page.getByRole("heading",{name:"Connected flooring workflow"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Create customer enquiry"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Reset fictional data"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 }
});
test("authenticated fictional customer write, persistence and transactional reset",async({page,context,request})=>{
 test.skip(!token||!mutate,"Requires active manager token and BMS_RUN_MUTATIONS=1");
 await auth(context);await page.goto("/flooring/operations");
 const suffix=Date.now().toString(36),name="Acceptance"+suffix;
 await page.getByLabel("New customer name").fill(name+" Example");
 await page.getByRole("button",{name:"Create customer",exact:true}).click();
 await expect(page.getByText("Saved to isolated demo database: create customer")).toBeVisible();
 await page.reload();
 const before=await (await request.get("/api/bms-demo/flooring-data")).json();
 expect(before.customers.some((c:any)=>c.first_name===name)).toBe(true);
 await page.getByLabel("Type RESET OAK AND STONE DEMO").fill("RESET OAK AND STONE DEMO");
 page.once("dialog",dialog=>dialog.accept());
 await page.getByRole("button",{name:"Reset fictional data"}).click();
 await expect(page.getByText("Saved to isolated demo database: reset demo")).toBeVisible();
 const after=await (await request.get("/api/bms-demo/flooring-data")).json();
 expect(after.customers.some((c:any)=>c.first_name===name)).toBe(false);
});
