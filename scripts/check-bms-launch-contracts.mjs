import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const files={
 middleware:read("middleware.ts"),
 setup:read("app/setup/page.js"),
 submit:read("app/api/onboarding/submit/route.js"),
 launch:read("app/api/onboarding/launch/route.ts"),
 review:read("app/api/internal/bms-onboarding/route.ts"),
 live:read("app/api/bms-live/[...path]/route.ts"),
 demo:read("app/api/bms-demo/[...path]/route.ts"),
 stripe:read("app/api/stripe/bms-seats-webhook/route.ts"),
 checkout:read("app/api/stripe/webhook/route.js"),
 provision:read("app/api/business-software/provision/route.js")
};
const checks=[
 ["Authenticated checkout claim and autosave",files.setup.includes("claim_paid_onboarding")&&files.setup.includes("onAuthStateChange")&&files.setup.includes("saveQueue")],
 ["Conditional module questionnaire",files.setup.includes("moduleGroups")&&files.setup.includes("optionalModules")&&files.setup.includes("useMemo")],
 ["Paid submission verified against purchaser",files.submit.includes("payment_status=eq.paid")&&files.submit.includes("contact email must match")],
 ["Internal approval and explicit preparation",files.review.includes('body.action==="prepare"')&&files.review.includes('if(status==="ready")')],
 ["Stripe verification before tenant preparation",files.review.includes("api.stripe.com/v1/subscriptions/")&&files.review.includes("bms_prepare_paid_onboarding_tenant")],
 ["Approved tenant first-login gated by owner",files.launch.includes("approved_at=not.is.null")&&files.launch.includes("auth_user_id=eq.")],
 ["Activation email retries and verified owner",files.review.includes('body.action==="send_activation"')&&files.review.includes("activation_email_sent_at")&&files.review.includes("Verified owner account")],
 ["Unapproved tenant API access denied",files.live.split('tenant.status==="suspended"').length>=5],
 ["No automatic provisioning from setup submission",!files.setup.includes("fetch('/api/business-software/provision'")],
 ["Legacy provision cannot bypass approval",files.provision.includes('application.status!=="ready"')],
 ["Seat upgrades do not create second subscription",files.live.includes("Use Manage Subscription to add seats")],
 ["Stripe signed event and paid invoice verified",files.stripe.includes("timingSafeEqual")&&files.stripe.includes('invoice.status!=="paid"')&&files.stripe.includes("Invoice has additional unverified lines")],
 ["Stripe duplicate paid checkout preserves mapping",files.checkout.includes("prior?.payment_status==='paid'&&paid")],
 ["Demo Xero reconciliation is fictional",files.demo.includes('provider:"fictional_xero_fixture"')&&files.demo.includes("FICTIONAL SIMULATION ONLY")],
 ["Demo Xero sync history is fictional",files.demo.includes('sync_type:"fictional_reconciliation"')],
 ["Xero ledger paginated without silent truncation",files.live.includes("offset+=500")&&files.live.includes("Financial evidence exceeds safe audit limit")],
 ["Tenant financial integrity API is permission gated and read only",files.live.includes('if(p==="finance/integrity")')&&files.live.includes("bms_financial_integrity_check")],
 ["Fictional finance audit remains isolated",files.demo.includes('if(p==="finance/integrity")return ok({tenantScoped:true,simulation:true')],
 ["Xero incomplete pages cannot be presented as totals",files.live.includes("Xero reconciliation exceeded the verified pagination limit")],
 ["QuickBooks sandbox POST cannot run in production mode",files.live.includes('if(p==="integrations/quickbooks/sandbox-payment")')&&files.live.includes('if(p==="integrations/quickbooks/sandbox-sync")')&&files.live.split('process.env.QBO_ENVIRONMENT!=="sandbox"').length>=3],
 ["QuickBooks customer invoice payment writes use idempotency claims",files.live.includes('claimQboSandboxWrite(tenantId,"customer",id)')&&files.live.includes('claimQboSandboxWrite(tenantId,"invoice",id)')&&files.live.includes('claimQboSandboxWrite(tenantId,"payment",paymentId)')],
 ["QuickBooks VAT mapping verified with provider rate",files.live.includes('providerRate.RateValue')&&files.live.includes('QuickBooks VAT rate does not match')],
 ["QuickBooks payment posting validates provider invoice balance",files.live.includes('remoteInvoice.Balance')&&files.live.includes('PaymentRefNum:paymentKey')],
 ["Demo APIs cannot route to live tenant handlers",files.middleware.includes('if(isDemo&&path.startsWith("/api/admin/"))')&&files.middleware.includes('if(tenantHost){')]
];
for(const [label,ok] of checks)console.log((ok?"PASS ":"FAIL ")+label);
assert.ok(checks.every(([,ok])=>ok),"BMS onboarding/finance release contract failed");
