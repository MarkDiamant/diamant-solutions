import { test, expect } from "@playwright/test";

/**
 * Protected, opt-in acceptance gate for the isolated fictional Flooring tenant.
 * BMS_DEMO_MANAGER_ACCESS_TOKEN must be stored only in a protected CI secret.
 * No credential is written to source, traces or screenshots.
 */
const token = process.env.BMS_DEMO_MANAGER_ACCESS_TOKEN;
const writeEnabled = process.env.BMS_DEMO_ALLOW_MUTATIONS === "true";
const origin = new URL(process.env.BMS_TEST_BASE_URL || "https://bms.diamantsolutions.co.uk").origin;

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

test("dedicated fictional manager can persist a customer, with no cross-tenant grant", async ({ browser }) => {
  test.skip(!token || !writeEnabled, "Requires protected demo-manager secret and explicit mutation opt-in");
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
  } finally {
    await context.close();
  }
});
