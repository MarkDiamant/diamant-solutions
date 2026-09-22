import { NextResponse } from "next/server";
import { publicTenant, tenantFromHost, tenantFromSlug } from "../../../../lib/business-software/tenants";

const SB=process.env.NEXT_PUBLIC_SUPABASE_URL;
const SK=process.env.SUPABASE_SERVICE_ROLE_KEY;

function cleanHost(value=""){return String(value).trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0].split(":")[0]}

async function databaseTenant({slug,host}){
  if(!SB||!SK)return null;
  const filter=slug?`slug=eq.${encodeURIComponent(slug)}`:`canonical_host=eq.${encodeURIComponent(cleanHost(host))}`;
  const response=await fetch(`${SB}/rest/v1/business_software_tenants?select=slug,business_name,canonical_host,status,billing_mode,reference_tenant,data_backend&${filter}&limit=1`,{headers:{apikey:SK,Authorization:`Bearer ${SK}`},cache:"no-store"});
  if(!response.ok)return null;
  const rows=await response.json().catch(()=>[]);
  const row=rows?.[0];
  return row?{id:row.slug,slug:row.slug,name:row.business_name,canonicalHost:row.canonical_host,status:row.status,billingMode:row.billing_mode,referenceTenant:Boolean(row.reference_tenant),dataBackend:row.data_backend}:null;
}

export async function GET(request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const host = url.searchParams.get("host");
  const tenant = await databaseTenant({slug,host:host||request.headers.get("host")||""}) || (slug ? tenantFromSlug(slug) : tenantFromHost(host || request.headers.get("host") || ""));
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  return NextResponse.json({ tenant: tenant.dataBackend?tenant:publicTenant(tenant) }, {headers:{ "Cache-Control": "private, max-age=0, must-revalidate" }});
}
