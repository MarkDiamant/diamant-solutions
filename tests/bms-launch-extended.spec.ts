import {test,expect} from "@playwright/test";
const demo="https://bms.diamantsolutions.co.uk",site="https://diamantsolutions.co.uk";
test("anonymous onboarding shows secure link entry, not a false saved-online state",async({page})=>{
 await page.goto(site+"/setup",{waitUntil:"networkidle"});
 await expect(page.getByRole("heading",{name:/set up your business/i})).toBeVisible();
 await expect(page.getByRole("button",{name:"Email my secure link"})).toBeVisible();
 await expect(page.getByText("Saved online")).toHaveCount(0);
});
test("flooring desktop shared shell exposes real current module routes",async({page})=>{
 await page.goto(demo+"/flooring",{waitUntil:"domcontentloaded"});
 await expect(page.getByText(/DEMO MODE.*Fictional data/)).toBeVisible();
 const nav=page.getByRole("navigation",{name:"Main navigation"});
 for(const label of ["Dashboard","Tasks","Scheduling","Customers","Jobs","Quotes","Price Book","Purchasing","Stock","Invoices","Payments & Money"]){
  await expect(nav.getByRole("link",{name:label,exact:true})).toHaveCount(1);
 }
 await expect(page.getByText("Application error")).toHaveCount(0);
});
test("flooring mobile navigation retains tenant identity and module access",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(demo+"/flooring",{waitUntil:"domcontentloaded"});
 await page.getByRole("button",{name:"Open navigation"}).click();
 const nav=page.getByRole("navigation",{name:"Main navigation"});
 await expect(nav.getByRole("link",{name:"Price Book"})).toBeVisible();
 await expect(nav.getByRole("link",{name:"Stock",exact:true})).toBeVisible();
 await expect(page.getByText(/Flooring & Tiles Demo/).first()).toBeVisible();
});
test("industry switching stays fictional and changes demo URL",async({page})=>{
 await page.goto(demo+"/flooring",{waitUntil:"domcontentloaded"});
 const industry=page.getByRole("group",{name:"Demo industry"});
 await expect(industry.getByRole("button")).toHaveCount(7);
 await industry.getByRole("button",{name:"Electrician"}).click();
 await expect(page).toHaveURL(/\/electrical/);
 await expect(page.getByText(/DEMO MODE.*Fictional data/)).toBeVisible();
});
test("fictional money ledger is isolated and internal review rejects spoofed hosts",async({request})=>{
 const r=await request.get(demo+"/api/admin/payments/money-decisions");
 expect(r.status()).toBe(200); // Fictional demo ledger is intentionally public and read-only.
 const ledger=await r.json();
 expect(ledger.simulation).toBe(true);
 expect(Array.isArray(ledger.decisions)).toBe(true);
 expect(ledger.payments[0].id).toBe("fictional-bms-payment-001");
 const x=await request.get(site+"/api/internal/bms-onboarding",{headers:{"x-forwarded-host":"fictional.diamantsolutions.co.uk"}});
 expect([401,403]).toContain(x.status());
});
