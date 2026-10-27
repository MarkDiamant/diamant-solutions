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

test.describe("protected fictional manager acceptance",()=>{
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
      expect(Math.abs(Number(invoice.total)-Number(invoice.amount_paid)-Number(invoice.amount_credited||0)-Number(invoice.amount_due))).toBeLessThanOrEqual(0.011);
    }
  } finally {
    await context.close();
  }
});

test("fictional manager can revise approve convert issue and download finance PDFs",async({browser})=>{
 const auth=await browser.newContext();let token="";try{const r=await auth.request.post(supabaseUrl+"/auth/v1/token?grant_type=password",{headers:{apikey:publishableKey,"Content-Type":"application/json"},data:{email:demoEmail,password:demoPassword}});expect(r.ok()).toBe(true);token=String((await r.json()).access_token||"")}finally{await auth.close()}
 const ctx=await browser.newContext({baseURL:origin});const job="47029266-51a3-4caa-b70d-fbb8a4d3c419";
 try{
  await ctx.addCookies([{name:"bms_access_token",value:token,url:origin,httpOnly:true,secure:true,sameSite:"Lax"}]);
  const nonce=Date.now().toString(36);const post=async(action:string,extra:Record<string,unknown>)=>{const r=await ctx.request.post("/api/bms-demo/flooring-actions",{headers:{origin},data:{action,job_id:job,request_key:"accept:"+action+":"+nonce,...extra}});expect(r.status(),await r.text()).toBe(200);return r.json()};
  await post("create_quote",{scope_text:"Fictional manager E2E flooring quote "+nonce,amount:125,vat_rate:20,lead_time:"5 working days"});
  const ledger=async()=>{const r=await ctx.request.get("/api/bms-demo/flooring-actions?job_id="+job);expect(r.status()).toBe(200);return r.json()};
  let data=await ledger();const quote=data.quotes[0];expect(quote.status).toBe("draft");expect(Number(quote.amount)).toBe(125);
  await post("approve_quote",{quote_id:quote.id});data=await ledger();expect(data.quotes[0].status).toBe("approved");
  const qpdf=await ctx.request.get("/api/bms-demo/flooring-actions?job_id="+job+"&format=pdf&kind=quote&id="+quote.id);expect(qpdf.status()).toBe(200);expect(qpdf.headers()["content-type"]).toContain("application/pdf");expect((await qpdf.body()).subarray(0,5).toString()).toBe("%PDF-");
  await post("create_draft_invoice",{});data=await ledger();const invoice=data.invoices.find((i:{source_quote_id?:string})=>i.source_quote_id===quote.id);expect(invoice).toBeTruthy();expect(Number(invoice.total)).toBe(150);
  if(invoice.status==="draft")await post("issue_invoice",{invoice_id:invoice.id,due_date:"2026-12-31"});
  data=await ledger();const issued=data.invoices.find((i:{id:string})=>i.id===invoice.id);expect(["issued","part_paid","paid","settled"]).toContain(issued.status);
  const ipdf=await ctx.request.get("/api/bms-demo/flooring-actions?job_id="+job+"&format=pdf&kind=invoice&id="+invoice.id);expect(ipdf.status()).toBe(200);expect((await ipdf.body()).subarray(0,5).toString()).toBe("%PDF-");
  expect(issued.source_quote_valid).toBe(true);expect(Number(issued.amount_due)+Number(issued.amount_paid)+Number(issued.amount_credited||0)).toBeCloseTo(150,2);
  if(process.env.BMS_DEMO_TEST_EMAIL){const recipient=process.env.BMS_DEMO_TEST_EMAIL;const draft=await post("draft_financial_email",{document_id:invoice.id,kind:"invoice",recipient});expect(draft.delivery.status).toBe("draft_created");if(process.env.BMS_DEMO_E2E_SEND_EMAIL==="true"){const sent=await post("send_financial_email",{document_id:invoice.id,kind:"invoice",recipient});expect(sent.delivery.status).toBe("accepted_by_gmail")}const audited=await ledger();expect(audited.email_history.some((e:{provider_message_id:string})=>e.provider_message_id===draft.delivery.gmail_id)).toBe(true)}
  const foreign=await ctx.request.get("/api/bms-demo/flooring-actions?job_id=00000000-0000-4000-8000-000000000001&format=pdf&kind=invoice&id="+invoice.id);expect(foreign.status()).not.toBe(200);
 }finally{await ctx.close()}
});

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

test("anonymous clients cannot download fictional invoice PDFs",async({request})=>{const r=await request.get("/api/bms-demo/flooring-actions?format=pdf&kind=invoice&job_id=00000000-0000-4000-8000-000000000000&id=00000000-0000-4000-8000-000000000000");expect(r.status()).toBe(403)});
test("anonymous clients cannot send fictional financial Gmail messages",async({request})=>{const r=await request.post("/api/bms-demo/flooring-actions",{headers:{origin},data:{action:"send_financial_email",request_key:"email-anonymous-denial",recipient:"test@example.com"}});expect(r.status()).toBe(403)});
