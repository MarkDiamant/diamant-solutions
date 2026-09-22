const TENANTS = {
  mjmetal: {
    id: "mjmetal",
    slug: "mjmetal",
    name: "M&J Metal",
    canonicalHost: "mjmetal.diamantsolutions.co.uk",
    legacyAdminHost: "mjmetal.co.uk",
    status: "active",
    billingMode: "free",
    referenceTenant: true,
  },
};

export function normaliseHost(value = "") {
  return String(value).trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
}

export function tenantFromHost(host) {
  const clean = normaliseHost(host);
  return Object.values(TENANTS).find((tenant) =>
    clean === tenant.canonicalHost || clean === tenant.legacyAdminHost
  ) || null;
}

export function tenantFromSlug(slug) {
  return TENANTS[String(slug || "").trim().toLowerCase()] || null;
}

export function publicTenant(tenant) {
  if (!tenant) return null;
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    canonicalHost: tenant.canonicalHost,
    status: tenant.status,
    billingMode: tenant.billingMode,
    referenceTenant: Boolean(tenant.referenceTenant),
  };
}

export { TENANTS };
