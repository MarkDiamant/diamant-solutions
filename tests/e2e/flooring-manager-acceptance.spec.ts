import { test, expect } from "@playwright/test";

/**
 * Protected, opt-in acceptance gate for the isolated fictional Flooring tenant.
 * BMS_DEMO_MANAGER_ACCESS_TOKEN must be stored only in a protected CI secret.
 * No credential is written to source, traces or screenshots.
 */
const demoEmail = process.env.BMS_DEMO_MANAGER_EMAIL;
const demoPassword = process.env.BMS_DEMO_MANAGER_PASSWORD;
const supabaseUrl = "https://iepqggrfenfqrqyzqyed.supabase.co";
const publishableKey = "sb_publishable_ivTCLFGFroexc-3IHe25bg_qhzg_GIy";
const writeEnabled = process.env.BMS_DEMO_ALLOW_MUTATIONS === "true";
const origin = new URL(process.env.BMS_TEST_BASE_URL || "https://bms.diamantsolutions.co.uk").origin;

test("public flooring catalogue exposes fictional list prices without private customer or supplier data", async ({ request }) => {
  const response = await request.get("/api/bms-demo/catalogue");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.fictional).toBe(true);
  expect(body.currency).toBe("GBP");
  expect(Array.isArray(body.products)).toBe(true);
  expect(body.products.length).toBeGreaterThan(0);
  for (const product of body.products) {
    expect(Object.keys(product).sort()).toEqual(["category", "coverage_m2", "list_price_net", "name", "sku", "unit"].sort());
  }
});

test("anonymous clients cannot mutate the flooring demo", async ({ request }) => {
  const response = await request.post("/api/bms-demo/flooring-actions", {
    headers: { origin },
    data: { action: "create_customer", first_name: "Denied", last_name: "Anonymous", request_key: "anonymous-negative-test" },
  });
  expect(response.status()).toBe(403);
});

test("cross-origin cookie writes are rejected before authentication", async ({ request }) => {
  const response = await request.post("/api/bms-demo/flooring-actions", {
    headers: { origin: "https://attacker.invalid" },
    data: { action: "create_customer", first_name: "Denied", last_name: "CrossOrigin", request_key: "cross-origin-negative-test" },
  });
  expect(response.status()).toBe(403);
});

test.skip(!demoEmail || !demoPassword || !writeEnabled, "Requires protected demo-manager credentials and explicit mutation opt-in");
test("dedicated fictional manager can persist a customer, with no cross-tenant grant", async ({ browser }) => {
  const login = await browser.newContext();
  let token: string;
  try {
    const response = await login.request.post(supabaseUrl + "/auth/v1/token?grant_type=password", {
      headers: { apikey: publishableKey, "Content-Type": "application/json" },
      data: { email: demoEmail, password: demoPassword },
    });
    expect(response.ok(), "Dedicated fictional demo-manager sign-in must succeed").toBe(true);
    token = String((await response.json()).access_token || "");
    expect(token.length).toBeGreaterThan(50);
  } finally { await login.close(); }
  const context = await browser.newContext({ baseURL: origin });
  try {
    await context.addCookies([{ name: "bms_access_token", value: token!, url: origin, httpOnly: true, secure: true, sameSite: "Lax" }]);
    const requestKey = "e2e-customer-" + Date.now().toString(36);
    const response = await context.request.post("/api/bms-demo/flooring-actions", {
      headers: { origin },
      data: { action: "create_customer", first_name: "Acceptance", last_name: "Test", email: "", request_key: requestKey },
    });
    expect(response.status(), await response.text()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, fictional: true, tenant: "flooring-showcase-demo", accounting_provider_connected: false });
    const retry = await context.request.post("/api/bms-demo/flooring-actions", {
      headers: { origin },
      data: { action: "create_customer", first_name: "Acceptance", last_name: "Test", email: "", request_key: requestKey },
    });
    expect(retry.status(), await retry.text()).toBe(200);
    expect((await retry.json()).result).toEqual(body.result);
    const jobList=await context.request.get("/api/bms-demo/flooring-actions?list_jobs=true");
    expect(jobList.status()).toBe(200);
    const availableJobs=(await jobList.json()).jobs;
    expect(Array.isArray(availableJobs)).toBe(true);
    expect(availableJobs.some((j:{id:string})=>j.id==="47029266-51a3-4caa-b70d-fbb8a4d3c419")).toBe(true);
    const finance=await context.request.get("/api/bms-demo/flooring-actions?job_id=47029266-51a3-4caa-b70d-fbb8a4d3c419");
    expect(finance.status(),await finance.text()).toBe(200);
    const ledger=await finance.json();
    expect(ledger).toMatchObject({fictional:true,tenant:"flooring-showcase-demo"});
    expect(Array.isArray(ledger.invoices)).toBe(true);
    expect(Array.isArray(ledger.allocations)).toBe(true);
    const csv=await context.request.get("/api/bms-demo/flooring-actions?job_id=47029266-51a3-4caa-b70d-fbb8a4d3c419&format=csv");
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(await csv.text()).toContain("Invoice number");
    const foreignJob=await context.request.get("/api/bms-demo/flooring-actions?job_id=00000000-0000-4000-8000-000000000001");
    expect(foreignJob.status()).toBe(409);
    for(const invoice of ledger.invoices){
      if(["void","voided","cancelled"].includes(String(invoice.status).toLowerCase()))continue;
      expect(Math.abs(Number(invoice.total)-Number(invoice.amount_paid)-Number(invoice.amount_due))).toBeLessThanOrEqual(0.011);
    }
  } finally {
    await context.close();
  }
});

test("anonymous clients cannot read private flooring finance ledger", async ({ request }) => {
 const response=await request.get("/api/bms-demo/flooring-actions?job_id=47029266-51a3-4caa-b70d-fbb8a4d3c419");
 expect(response.status()).toBe(403);
});

test("spoofed forwarded-host cannot bypass cross-origin write protection", async ({ request }) => {
 const response=await request.post("/api/bms-demo/flooring-actions",{headers:{origin:"https://attacker.invalid","x-forwarded-host":"attacker.invalid"},data:{action:"create_customer",first_name:"Denied",last_name:"SpoofedHost",request_key:"forged-forwarded-host-test"}});
 expect(response.status()).toBe(403);
});

test("anonymous clients cannot list private fictional jobs",async({request})=>{
 const r=await request.get("/api/bms-demo/flooring-actions?list_jobs=true");
 expect(r.status()).toBe(403);
});
