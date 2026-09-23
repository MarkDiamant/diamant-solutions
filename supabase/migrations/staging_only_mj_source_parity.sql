-- For isolated staging only. Review before applying.
begin;
alter table public.business_software_customers add column if not exists xero_contact_id text;
alter table public.business_software_activities add column if not exists next_action_assignee text;
alter table public.business_software_job_costs add column if not exists paid_at timestamptz, add column if not exists due_at timestamptz;
alter table public.business_software_jobs add column if not exists written_off_amount numeric not null default 0, add column if not exists written_off_at timestamptz, add column if not exists write_off_reason text;
alter table public.business_software_users add column if not exists legacy_manager_initials text;
alter table public.business_software_audit_events add column if not exists legacy_source_id uuid, add column if not exists legacy_job_id uuid, add column if not exists legacy_changes jsonb, add column if not exists legacy_created_at timestamptz;
create unique index if not exists bms_audit_legacy_source_unique on public.business_software_audit_events(tenant_id,legacy_source_id) where legacy_source_id is not null;
alter table public.business_software_integrations add column if not exists external_tenant_id text;
create table if not exists public.business_software_integration_events (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.business_software_tenants(id),
 job_id uuid references public.business_software_jobs(id),
 source text not null,
 external_id text,
 event_type text not null,
 payload jsonb not null default '{}'::jsonb,
 processed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists bms_integration_events_tenant_time on public.business_software_integration_events(tenant_id,created_at desc);
alter table public.business_software_integration_events enable row level security;
commit;
