import {test,expect} from "@playwright/test";
const base="https://bms.diamantsolutions.co.uk";
test("Fictional Flooring Demo renders shared dashboard",async({page})=>{
 await page.goto(base+"/flooring",{waitUntil:"domcontentloaded"});
 await expect(page).toHaveURL(/\/flooring/);
 await expect(page.locator("body")).not.toBeEmpty();
 await expect(page.locator("body")).not.toContainText("Application error");
});
test("Fictional Xero audit is isolated and labelled",async({request})=>{
 const r=await request.get(base+"/api/admin/integrations/xero/reconciliation-audit",{headers:{"x-bms-demo-sample":"flooring"}});
 expect(r.ok()).toBeTruthy();
 const j=await r.json();
 expect(j.simulation).toBe(true);
 expect(j.provider).toBe("fictional_xero_fixture");
 expect(j.warning).toContain("FICTIONAL SIMULATION ONLY");
 expect(j.externalEvidence.some((x:any)=>x.status==="amount_mismatch")).toBe(true);
 expect(j.bankReceiptsFlaggedNonCustomer.total).toBe(250);
});
test("Fictional Xero sync-history cannot report real connection",async({request})=>{
 const [history,status]=await Promise.all([
 request.get(base+"/api/admin/integrations/xero/sync-history",{headers:{"x-bms-demo-sample":"flooring"}}),
 request.get(base+"/api/admin/integrations/xero/status",{headers:{"x-bms-demo-sample":"flooring"}})
 ]);
 expect(history.ok()).toBeTruthy();
 expect((await history.json()).simulation).toBe(true);
 expect((await status.json()).connected).toBe(false);
});
test("Fictional demo blocks live mutation APIs",async({request})=>{
 const r=await request.post(base+"/api/business-software/provision",{data:{tenantId:"00000000-0000-0000-0000-000000000000"}});
 expect(r.status()).toBe(403);
});
test("Internal review and onboarding launch reject unauthenticated access",async({request})=>{
 const r=await request.get("https://diamantsolutions.co.uk/api/internal/bms-onboarding");
 expect([401,403]).toContain(r.status());
 const launch=await request.get("https://diamantsolutions.co.uk/api/onboarding/launch?tenantId=00000000-0000-0000-0000-000000000000");
 expect(launch.status()).toBe(401);
});
