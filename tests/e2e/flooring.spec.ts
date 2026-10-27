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
test("public website catalogue excludes customer prices, supplier costs and private records",async({request})=>{
 const r=await request.get("/api/bms-demo/catalogue");
 expect(r.status()).toBe(200);
 const d=await r.json();
 expect(d.fictional).toBe(true);
 expect(d.schema_version).toBe(1);
 expect(d.products.length).toBe(4);
 expect(d.products.every((p:any)=>p.sku&&p.name&&Number(p.coverage_m2)>0&&Number(p.list_price_net)>0)).toBe(true);
 const raw=JSON.stringify(d);
 for(const privateKey of ["customer_prices","cost_net","customer_id","supplier_id","auth_user_id","email","phone"])expect(raw).not.toContain('"'+privateKey+'"');
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
 await page.getByLabel("Customer",{exact:true}).selectOption({label:name+" Example"});
 await page.getByRole("button",{name:"Create customer enquiry"}).click();
 await expect(page.getByText("Saved to isolated demo database: create enquiry")).toBeVisible();
 await page.getByLabel("Quote scope").fill("Fictional flooring acceptance "+suffix);
 await page.getByLabel("Quote net amount (£)").fill("888");
 await page.getByLabel("Quote lead time").fill("7 working days");
 await page.getByRole("button",{name:"Save quote revision"}).click();
 await expect(page.getByText("Saved to isolated demo database: create quote")).toBeVisible();
 await page.getByLabel("Quote net amount (£)").fill("900");
 await page.getByRole("button",{name:"Save quote revision"}).click();
 await expect(page.getByText("Saved to isolated demo database: create quote")).toBeVisible();
 await page.getByRole("button",{name:"Create sales order"}).click();
 await expect(page.getByText("Saved to isolated demo database: create sales order")).toBeVisible();
 await page.getByRole("button",{name:"Create purchase order"}).click();
 await expect(page.getByText("Saved to isolated demo database: create purchase order")).toBeVisible();
 await page.getByRole("button",{name:"Plan delivery for sales order"}).click();
 await expect(page.getByText("Saved to isolated demo database: plan delivery")).toBeVisible();
 await page.getByRole("button",{name:"Invoice latest saved quote"}).click();
 await expect(page.getByText("Saved to isolated demo database: create draft invoice")).toBeVisible();
 await page.getByLabel("Quantity for stock action").fill("1");
 await page.getByRole("button",{name:"Receive goods"}).click();
 await expect(page.getByText("Saved to isolated demo database: receive")).toBeVisible();
 await page.getByRole("button",{name:"Reserve stock"}).click();
 await expect(page.getByText("Saved to isolated demo database: reserve")).toBeVisible();
 await page.getByRole("button",{name:"Pick stock"}).click();
 await expect(page.getByText("Saved to isolated demo database: pick")).toBeVisible();
 await page.getByRole("button",{name:"Confirm delivery"}).click();
 await expect(page.getByText("Saved to isolated demo database: deliver")).toBeVisible();
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
