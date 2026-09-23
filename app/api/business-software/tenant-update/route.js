import { NextResponse } from "next/server";
import { centralRest } from "../../../../lib/business-software/db";
import { requireTenantMember } from "../../../../lib/business-software/tenant-access";

// Isolated M&J staging only. Explicit field allowlists, server-verified tenant,
// and a tenant filter on every mutation. Never expose a generic table writer.
const STAGING_TENANT = "3ebc2265-8842-4826-b464-71783d6cf841";
const RESOURCES = Object.freeze({
  customers: { table: "business_software_customers", fields: ["first_name","last_name","phone","email","address_line_1","address_line_2","city","postcode"] },
  jobs: { table: "business_software_jobs", fields: ["job_type","status","manager","next_action","next_action_at","scheduled_at","expected_completion_at","internal_notes","customer_requirements"] },
});
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
const responseHeaders = { "Cache-Control": "no-store" };
export async function PATCH(request) {
  if (process.env.BMS_STAGING_PREVIEW !== "true" ||
      process.env.DS_SUPABASE_URL !== "https://sfxeyydkwzlduflpmidd.supabase.co") {
    return NextResponse.json({error:"Staging-only operation"},{status:403,headers:responseHeaders});
  }
  const body = await request.json().catch(() => null);
  if (!body || body.tenant_id !== STAGING_TENANT || !uuid(body.id) ||
      !body.values || typeof body.values !== "object" || Array.isArray(body.values)) {
    return NextResponse.json({error:"Invalid request"},{status:400,headers:responseHeaders});
  }
  const resource = RESOURCES[body.resource];
  if (!resource) return NextResponse.json({error:"Unsupported resource"},{status:400,headers:responseHeaders});
  const values = Object.entries(body.values);
  if (!values.length || values.length > resource.fields.length ||
      values.some(([key,value]) => !resource.fields.includes(key) ||
        (value !== null && typeof value !== "string") ||
        (typeof value === "string" && value.length > 4000))) {
    return NextResponse.json({error:"Unsupported field or value"},{status:400,headers:responseHeaders});
  }
  const session = await requireTenantMember(request,STAGING_TENANT,["owner","admin","manager"]);
  if (!session.ok) return NextResponse.json({error:session.error},{status:session.status,headers:responseHeaders});
  try {
    const query = new URLSearchParams({tenant_id:"eq."+session.tenantId,id:"eq."+body.id,select:"id,updated_at"});
    const result = await centralRest(resource.table+"?"+query.toString(),{
      method:"PATCH",
      headers:{Prefer:"return=representation"},
      body:JSON.stringify({...body.values,updated_at:new Date().toISOString()}),
    });
    if (!result.ok) return NextResponse.json({error:"Update rejected"},{status:409,headers:responseHeaders});
    const rows = await result.json();
    if (rows.length !== 1) return NextResponse.json({error:"Record not found"},{status:404,headers:responseHeaders});
    return NextResponse.json({ok:true,record:rows[0]},{headers:responseHeaders});
  } catch {
    return NextResponse.json({error:"Staging update unavailable"},{status:503,headers:responseHeaders});
  }
}
