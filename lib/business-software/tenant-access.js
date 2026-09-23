import { centralRest } from "./db";

/**
 * Server-side tenant authorisation for privileged BMS routes.
 * Never trust a browser-provided tenant slug, tenant ID, host or JWT claims
 * without verifying the bearer token with Supabase Auth.
 * The service-role database client is only used AFTER identity verification.
 */
export async function requireTenantMember(request, tenantId, allowedRoles = ["owner", "admin", "manager", "user"]) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(tenantId || ""))) {
    return { ok: false, status: 400, error: "Invalid tenant" };
  }
  const bearer = request.headers.get("authorization") || "";
  if (!/^Bearer [^\s]+$/.test(bearer)) {
    return { ok: false, status: 401, error: "Authentication required" };
  }
  const url = process.env.DS_SUPABASE_URL;
  const publishable = process.env.DS_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishable || !process.env.DS_SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, status: 503, error: "Tenant authentication unavailable" };
  }
  // /auth/v1/user verifies the JWT against the Auth server, rather than
  // trusting user-controlled email, metadata, or unsigned JWT decoding.
  try {
  const identity = await fetch(url + "/auth/v1/user", {
    headers: { apikey: publishable, Authorization: bearer },
    cache: "no-store",
  });
  if (!identity.ok) return { ok: false, status: 401, error: "Invalid session" };
  const user = await identity.json();
  if (!user?.id) return { ok: false, status: 401, error: "Invalid session" };

  const members = await centralRest(
    "business_software_users?tenant_id=eq." + encodeURIComponent(tenantId) +
    "&auth_user_id=eq." + encodeURIComponent(user.id) +
    "&status=eq.active&select=tenant_id,role&limit=1"
  );
  if (!members.ok) return { ok: false, status: 503, error: "Membership lookup unavailable" };
  const [member] = await members.json();
  if (!member || !allowedRoles.includes(member.role)) {
    return { ok: false, status: 403, error: "Tenant access denied" };
  }
  const tenant = await centralRest(
    "business_software_tenants?id=eq." + encodeURIComponent(tenantId) +
    "&status=eq.active&select=id,slug,status,billing_mode,reference_tenant,data_backend&limit=1"
  );
  if (!tenant.ok) return { ok: false, status: 503, error: "Tenant lookup unavailable" };
  const [record] = await tenant.json();
  if (!record) return { ok: false, status: 403, error: "Tenant unavailable" };
  const stagingPreview = process.env.BMS_STAGING_PREVIEW === "true" &&
    process.env.DS_SUPABASE_URL === "https://sfxeyydkwzlduflpmidd.supabase.co" &&
    record.data_backend === "staging";
  if (record.data_backend !== "central" && !stagingPreview) return { ok: false, status: 503, error: "Tenant migration to central data storage is incomplete" };
  return { ok: true, userId: user.id, tenantId: record.id, role: member.role, slug: record.slug, billingMode: record.billing_mode, referenceTenant: Boolean(record.reference_tenant) };
  } catch {
    return { ok: false, status: 503, error: "Tenant authentication temporarily unavailable" };
  }
}
