import { NextResponse } from "next/server";
import { centralRest } from "../../../../lib/business-software/db";
import { requireTenantMember } from "../../../../lib/business-software/tenant-access";

// Read-only, tenant-scoped preview adapter. Never accept arbitrary table names,
// column lists or filter expressions from the browser.
const RESOURCES = Object.freeze({
  customers: { table: "business_software_customers", columns: "id,first_name,last_name,phone,email,address_line_1,address_line_2,city,postcode,created_at,updated_at", order: "created_at.desc" },
  jobs: { table: "business_software_jobs", columns: "id,sequence_number,reference,customer_id,job_type,job_types,status,manager,enquiry_at,quoted_amount,agreed_amount,next_action,next_action_at,scheduled_at,completed_at,created_at,updated_at", order: "sequence_number.desc" },
  payments: { table: "business_software_payments", columns: "id,job_id,direction,payment_type,amount,payment_method,counterparty,paid_at,due_at,created_at", order: "created_at.desc" },
  quotes: { table: "business_software_quotes", columns: "id,job_id,version,status,amount,deposit_amount,vat_rate,valid_until,pdf_path,sent_at,created_at", order: "created_at.desc" },
  invoices: { table: "business_software_invoices", columns: "id,job_id,provider,external_invoice_id,invoice_number,status,total,amount_due,amount_paid,created_at", order: "created_at.desc" },
  people: { table: "business_software_people", columns: "id,name,company,phone,email,capabilities,relationship_type,active,created_at", order: "created_at.desc" },
  assignments: { table: "business_software_job_people", columns: "id,job_id,person_id,scope,assignment_role,agreed_cost,deposit_amount,paid_amount,status,created_at", order: "created_at.desc" },
  audit: { table: "business_software_audit_events", columns: "id,actor,action,entity_type,entity_id,occurred_at,legacy_source_id", order: "occurred_at.desc" },
  files: { table: "business_software_files", columns: "id,job_id,storage_path,file_name,category,created_at", order: "created_at.desc" },
  costs: { table: "business_software_job_costs", columns: "id,job_id,category,supplier,estimated_amount,actual_amount,paid_amount,paid_at,due_at,created_at", order: "created_at.desc" },
});

export async function GET(request) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenant_id");
  const resource = RESOURCES[url.searchParams.get("resource")];
  const noStore = { "Cache-Control": "no-store" };
  if (!resource) return NextResponse.json({ error: "Unsupported resource" }, { status: 400, headers: noStore });
  const session = await requireTenantMember(request, tenantId);
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status, headers: noStore });
  try {
    const query = new URLSearchParams({
      tenant_id: "eq." + session.tenantId,
      select: resource.columns,
      order: resource.order,
      limit: "250",
    });
    const response = await centralRest(resource.table + "?" + query.toString());
    if (!response.ok) return NextResponse.json({ error: "Tenant data unavailable" }, { status: 503, headers: noStore });
    return NextResponse.json({ data: await response.json() }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Tenant data temporarily unavailable" }, { status: 503, headers: noStore });
  }
}
