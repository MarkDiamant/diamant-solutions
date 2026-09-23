-- Disposable CI-only PostgreSQL fixture. No real Supabase data or credentials.
create schema auth;
create role authenticated nologin;
create role anon nologin;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

create table public.business_software_tenants(
 id uuid primary key, slug text unique, status text not null
);
create table public.business_software_users(
 id uuid primary key, tenant_id uuid not null references public.business_software_tenants(id),
 status text not null, role text not null
);
create table public.business_software_tenant_settings(
 tenant_id uuid primary key references public.business_software_tenants(id), business_name text
);
-- Minimal structural stand-ins; real production schema is audited separately.
do $$
declare tab text;
begin
 foreach tab in array array[
  'business_software_customers','business_software_jobs','business_software_activities',
  'business_software_people','business_software_job_people','business_software_payments',
  'business_software_job_costs','business_software_quotes','business_software_files',
  'business_software_suppliers','business_software_material_orders','business_software_invoices',
  'business_software_job_sequences'
 ] loop
  execute format('create table public.%I(id uuid primary key, tenant_id uuid not null references public.business_software_tenants(id))',tab);
 end loop;
end $$;
-- The migration is loaded after this fixture.
