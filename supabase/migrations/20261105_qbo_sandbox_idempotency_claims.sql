create table if not exists public.business_software_qbo_sandbox_write_claims (
 tenant_id uuid not null references public.business_software_tenants(id) on delete cascade,
 kind text not null check (kind in ('customer','invoice','payment')),
 record_id uuid not null,
 claimed_at timestamptz not null default now(),
 primary key (tenant_id,kind,record_id)
);
alter table public.business_software_qbo_sandbox_write_claims enable row level security;
revoke all on public.business_software_qbo_sandbox_write_claims from anon,authenticated;
comment on table public.business_software_qbo_sandbox_write_claims is 'Fail-closed sandbox provider write claims. Claims require manual reconciliation after ambiguous provider outcomes.';
