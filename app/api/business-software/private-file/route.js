import { NextResponse } from "next/server";
import { requireTenantMember } from "../../../../lib/business-software/tenant-access";

const BUCKET = "bms-job-files";
const noStore = { "Cache-Control": "no-store" };

// Generate short-lived private downloads only for the authenticated tenant.
// Never accept bucket names or arbitrary Storage prefixes from the browser.
export async function POST(request) {
  let payload;
  try { payload = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  }
  const { tenant_id: tenantId, path } = payload || {};
  const session = await requireTenantMember(request, tenantId);
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status, headers: noStore });
  if (typeof path !== "string" || path.length > 1024 ||
      !path.startsWith(session.tenantId + "/") ||
      path.split("/").some(segment => !segment || segment === "." || segment === ".." || segment.includes("\\"))) {
    return NextResponse.json({ error: "Invalid tenant file path" }, { status: 400, headers: noStore });
  }
  const base = process.env.DS_SUPABASE_URL;
  const secret = process.env.DS_SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !secret) return NextResponse.json({ error: "Storage unavailable" }, { status: 503, headers: noStore });
  try {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(base + "/storage/v1/object/sign/" + BUCKET + "/" + encoded, {
      method: "POST",
      headers: { apikey: secret, Authorization: "Bearer " + secret, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 60 }),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "Private file unavailable" }, { status: response.status === 404 ? 404 : 503, headers: noStore });
    const signed = await response.json();
    if (typeof signed.signedURL !== "string" || !signed.signedURL.startsWith("/storage/v1/object/sign/")) {
      return NextResponse.json({ error: "Storage response invalid" }, { status: 503, headers: noStore });
    }
    return NextResponse.json({ url: base + signed.signedURL, expiresIn: 60 }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Private file temporarily unavailable" }, { status: 503, headers: noStore });
  }
}
