import { NextResponse } from "next/server";
import { requireTenantMember } from "../../../../lib/business-software/tenant-access";

// Authenticated tenant session probe. Does not expose any customer data.
// Shared privileged endpoints should use the same guard before database access.
export async function GET(request) {
  const tenantId = new URL(request.url).searchParams.get("tenant_id");
  const result = await requireTenantMember(request, tenantId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, {
      status: result.status, headers: { "Cache-Control": "no-store" }
    });
  }
  return NextResponse.json({
    tenantId: result.tenantId, role: result.role, slug: result.slug
  }, { headers: { "Cache-Control": "no-store" } });
}
