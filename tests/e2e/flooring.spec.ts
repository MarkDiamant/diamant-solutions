import {test,expect,type BrowserContext} from "@playwright/test";
const base=process.env.BMS_TEST_BASE_URL||"https://bms.diamantsolutions.co.uk";
const token=process.env.BMS_TEST_ACCESS_TOKEN||"";
const email=process.env.BMS_TEST_EMAIL||"",password=process.env.BMS_TEST_PASSWORD||"",publishableKey=process.env.BMS_TEST_SUPABASE_PUBLISHABLE_KEY||"";
const hasAuth=Boolean(token||(email&&password&&publishableKey));
const mutate=process.env.BMS_RUN_MUTATIONS==="1";
async function auth(context:BrowserContext){
 let accessToken=token;
 if(!accessToken){
  if(!email||!password||!publishableKey)throw Error("Configure dedicated fictional-demo manager credentials in protected CI secrets");
  const r=await context.request.post("https://iepqggrfenfqrqyzqyed.supabase.co/auth/v1/token?grant_type=password",{headers:{apikey:publishableKey,"Content-Type":"application/json"},data:{email,password}});
  if(!r.ok())throw Error("Dedicated fictional-demo manager login failed");
  accessToken=String((await r.json()).access_token||"");
  if(!accessToken)throw Error("Demo manager login returned no access token");
 }
 await context.addCookies([{name:"bms_access_token",value:accessToken,url:base,httpOnly:true,secure:true,sameSite:"Lax"}]);
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
test("fictional cookie-write endpoint rejects missing and cross-site Origin before authentication",async({request})=>{
 const payload={action:"__non_mutating_auth_probe__",request_key:"origin-test-fictitious-001"};
 const missing=await request.post("/api/bms-demo/flooring-actions",{data:payload});
 expect(missing.status()).toBe(403);
 expect((await missing.json()).error).toMatch(/origin required/i);
 const foreign=await request.post("/api/bms-demo/flooring-actions",{headers:{Origin:"https://attacker.invalid"},data:payload});
 expect(foreign.status()).toBe(403);
 expect((await foreign.json()).error).toMatch(/Cross-site demo mutations are blocked/);
});
test("public Flooring Demo renders responsive read-only workflow without a session",async({page})=>{
 const hydrationErrors:string[]=[];page.on("pageerror",e=>{if(/hydration|React error #418/i.test(e.message))hydrationErrors.push(e.message)});
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:850});
  const r=await page.goto("/flooring/operations");
  expect(r?.status()).toBe(200);
  await expect(page.getByRole("heading",{name:"Connected flooring workflow"})).toBeVisible();
  await page.getByRole("combobox",{name:"Product",exact:true}).selectOption({label:"Natural oak 8mm laminate"});
  await page.getByRole("combobox",{name:"Customer",exact:true}).selectOption({label:"Sarah Collins"});
  await expect(page.getByText(/24 pack.*£37\.00 per unit/i).first()).toBeVisible();
  await page.getByRole("combobox",{name:"Customer",exact:true}).selectOption({label:"North London Developments"});
  await expect(page.getByText(/24 pack.*£39\.00 per unit/i).first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  expect(await page.locator("a a").count()).toBe(0);
 }
 expect(hydrationErrors).toEqual([]);
});
test("fictional demo banner and seven-industry selector switch routes without hiding navigation",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/flooring/operations");
 await expect(page.getByText(/DEMO MODE · Fictional data/)).toBeVisible();
 const industries=page.getByRole("group",{name:"Demo industry"});
 await expect(industries.getByRole("button")).toHaveCount(7);
 await expect(industries.getByRole("button",{name:"Flooring & Tiles"})).toHaveAttribute("aria-pressed","true");
 await industries.getByRole("button",{name:"Electrician"}).click();
 await expect(page).toHaveURL(/\/electrical\/operations/);
 await expect(industries.getByRole("button",{name:"Electrician"})).toHaveAttribute("aria-pressed","true");
 await industries.getByRole("button",{name:"Flooring & Tiles"}).click();
 await expect(page).toHaveURL(/\/flooring\/operations/);
 await page.getByRole("button",{name:"Open navigation"}).click();
 await expect(page.getByRole("navigation",{name:/main/i})).toBeVisible();
 await expect(page.getByRole("link",{name:"Purchasing & Stock"})).toBeVisible();
 await page.setViewportSize({width:1280,height:900});
 await expect(page.getByText(/DEMO MODE · Fictional data/)).toBeVisible();
 await expect(industries.getByRole("button",{name:"Flooring & Tiles"})).toHaveAttribute("aria-pressed","true");
 await expect(page.getByRole("link",{name:"Purchasing & Stock"})).toBeVisible();
});
test("mobile BMS header and original Ruby portrait render across phone and tablet sizes",async({page})=>{
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  await page.goto("/flooring/operations");
  await expect(page.getByRole("link",{name:"Ask Ruby"}).first()).toBeVisible();
  const avatar=page.locator("img.bms-ruby-avatar:visible").first();
  await expect(avatar).toBeVisible();
  expect(await avatar.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 }
});
test("connected website catalogue preview agrees with the public privacy-filtered export",async({page,request})=>{
 const r=await request.get("/api/bms-demo/catalogue");expect(r.status()).toBe(200);
 const catalogue=await r.json();
 expect(catalogue.schema_version).toBe(1);
 expect(catalogue.products).toHaveLength(4);
 const privateKeys=["customer_prices","cost_net","customer_id","supplier_id","auth_user_id","email","phone"];
 for(const product of catalogue.products){
  expect(product.sku).toBeTruthy();
  expect(Number(product.coverage_m2)).toBeGreaterThan(0);
  expect(Number(product.list_price_net)).toBeGreaterThan(0);
  for(const key of privateKeys)expect(product).not.toHaveProperty(key);
 }
 await page.goto("/flooring/operations");
 await expect(page.getByRole("heading",{name:"Connected flooring workflow"})).toBeVisible();
 await expect(page.getByRole("combobox",{name:"Product",exact:true}).locator("option")).toHaveCount(4);
 const ui=await page.locator("main").innerText();
 for(const product of catalogue.products)expect(ui).toContain(product.name);
});
test("mobile New Job menu supports arrow navigation, Escape and focus restoration",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/flooring/operations");
 await page.getByRole("button",{name:"Open navigation"}).click();
 const trigger=page.locator(".bms-mobile-new-job .bms-new-job-button");
 await trigger.focus();
 await trigger.press("ArrowDown");
 await expect(page.getByRole("menuitem",{name:"Quick Add Job"})).toBeFocused();
 await page.keyboard.press("ArrowDown");
 await expect(page.getByRole("menuitem",{name:"Full Job"})).toBeFocused();
 await page.keyboard.press("Escape");
 await expect(trigger).toHaveAttribute("aria-expanded","false");
 await expect(trigger).toBeFocused();
});
test("fictional reset requires exact phrase and an explicit confirmation",async({page})=>{
 await page.goto("/flooring/operations");
 const reset=page.getByRole("button",{name:"Reset fictional data"});
 await expect(reset).toBeDisabled();
 await page.getByLabel("Type RESET OAK AND STONE DEMO").fill("RESET OAK AND STONE");
 await expect(reset).toBeDisabled();
 await page.getByLabel("Type RESET OAK AND STONE DEMO").fill("RESET OAK AND STONE DEMO");
 await expect(reset).toBeEnabled();
 page.once("dialog",dialog=>dialog.dismiss());
 await reset.click();
 await expect(page.getByLabel("Type RESET OAK AND STONE DEMO")).toHaveValue("RESET OAK AND STONE DEMO");
});
test("worker and labour demo routes fail safely without crashing or claiming saved changes",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/flooring/worker");
 await expect(page.getByRole("heading",{name:"My work"})).toBeVisible();
 await expect(page.getByText(/Worker operations are unavailable in this fictional preview/)).toBeVisible();
 await page.goto("/flooring/labour");
 await expect(page.getByRole("heading",{name:"Labour and job costing"})).toBeVisible();
 await expect(page.getByText(/Labour costing is unavailable/)).toBeVisible();
 expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
test("anonymous browser write shows a clear denial and persists nothing",async({page,request})=>{
 const before=await (await request.get("/api/bms-demo/flooring-data")).json();
 await page.goto("/flooring/operations");
 await page.getByLabel("New customer name").fill("Anonymous BrowserProbe");
 await page.getByRole("button",{name:"Create customer",exact:true}).click();
 await expect(page.getByText(/Action not saved: Authenticated BMS manager required/)).toBeVisible();
 const after=await (await request.get("/api/bms-demo/flooring-data")).json();
 expect(after.customers.length).toBe(before.customers.length);
});
test("authenticated manager desktop and mobile rendering",async({page,context})=>{
 test.skip(!hasAuth,"Requires a dedicated fictional-demo manager test account");
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
 test.skip(!hasAuth||!mutate,"Requires dedicated manager credentials and BMS_RUN_MUTATIONS=1");
 await auth(context);await page.goto("/flooring/operations");
 const suffix=Date.now().toString(36),name="Acceptance"+suffix;
 await page.getByLabel("New customer name").fill(name+" Example");
 await page.getByRole("button",{name:"Create customer",exact:true}).click();
 await expect(page.getByText("Saved to isolated demo database: create customer")).toBeVisible();
 await page.reload();
 await page.getByRole("combobox",{name:"Customer",exact:true}).selectOption({label:name+" Example"});
 await page.getByRole("combobox",{name:"Product",exact:true}).selectOption({label:"Natural oak 8mm laminate"});
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
 const savedCustomer=before.customers.find((c:any)=>c.first_name===name);
 expect(savedCustomer).toBeTruthy();
 const savedJob=before.jobs.find((j:any)=>j.customer_id===savedCustomer.id);
 expect(savedJob).toBeTruthy();
 const revisions=before.quotes.filter((q:any)=>q.job_id===savedJob.id).sort((a:any,b:any)=>a.version-b.version);
 expect(revisions.length).toBe(2);
 expect(revisions.map((q:any)=>Number(q.amount))).toEqual([888,900]);
 const order=before.sales.find((o:any)=>o.job_id===savedJob.id);
 expect(order).toBeTruthy();
 const orderLine=before.sales_lines.find((l:any)=>l.sales_order_id===order.id);
 expect(orderLine).toBeTruthy();
 expect(Number(orderLine.quantity)).toBe(24);
 expect(Number(orderLine.agreed_unit_net)).toBe(39); // New fictional customer has standard price; seeded Sarah Collins retains the £37 override.
 expect(Number(orderLine.reserved_quantity)).toBeGreaterThanOrEqual(1);
 expect(Number(orderLine.picked_quantity)).toBeGreaterThanOrEqual(1);
 expect(before.purchase_lines.length).toBeGreaterThan(1);
 expect(before.deliveries.length).toBeGreaterThan(1);
 const invoice=before.invoices.find((i:any)=>i.job_id===savedJob.id);
 expect(invoice).toBeTruthy();
 expect(Number(invoice.total)).toBe(1080);
 expect(invoice.source_quote_id).toBe(revisions[1].id);
 expect(invoice.invoice_number).toMatch(/^FLI/);
 await page.getByLabel("Type RESET OAK AND STONE DEMO").fill("RESET OAK AND STONE DEMO");
 page.once("dialog",dialog=>dialog.accept());
 await page.getByRole("button",{name:"Reset fictional data"}).click();
 await expect(page.getByText("Saved to isolated demo database: reset demo")).toBeVisible();
 const after=await (await request.get("/api/bms-demo/flooring-data")).json();
 expect(after.customers.some((c:any)=>c.first_name===name)).toBe(false);
});
