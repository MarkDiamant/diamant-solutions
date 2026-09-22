import { NextResponse } from "next/server";
import { publicTenant, tenantFromHost, tenantFromSlug } from "@/lib/business-software/tenants";

export async function GET(request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const host = url.searchParams.get("host");
  const tenant = slug ? tenantFromSlug(slug) : tenantFromHost(host || request.headers.get("host") || "");
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  return NextResponse.json({ tenant: publicTenant(tenant) }, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
  });
}
