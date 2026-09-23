-- REVIEWED STAGING MIGRATION ONLY. Do not run against live central DB before tests.
-- M&J production database is NOT a target of this migration.
begin;
alter table public.business_software_users
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists business_software_users_tenant_auth_uid
  on public.business_software_users(tenant_id, auth_user_id)
  where auth_user_id is not null;
create index if not exists business_software_users_auth_uid_active
  on public.business_software_users(auth_user_id, tenant_id)
  where auth_user_id is not null and status = 'active';

-- SECURITY DEFINER membership helper avoids recursive users-table RLS.
-- Only auth.uid(), not email or user-supplied slug, identifies a member.
create or replace function public.bms_is_active_member(p_tenant uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_software_users u
    join public.business_software_tenants t on t.id = u.tenant_id
    where u.tenant_id = p_tenant
      and u.auth_user_id = (select auth.uid())
      and u.status = 'active'
      and t.status = 'active'
  );
$$;
revoke all on function public.bms_is_active_member(uuid) from public, anon;
grant execute on function public.bms_is_active_member(uuid) to authenticated;

-- Do not enable access to integration tokens, billing, internal audit or
-- privileged OAuth/session tables through generic member policies.
-- All business-data policies below are READ ONLY pending role-specific
-- authorization for each mutation route.
do $$
declare tab text;
begin
  foreach tab in array array[
    'business_software_customers',
    'business_software_jobs',
    'business_software_activities',
    'business_software_people',
    'business_software_job_people',
    'business_software_payments',
    'business_software_job_costs',
    'business_software_quotes',
    'business_software_files',
    'business_software_suppliers',
    'business_software_material_orders',
    'business_software_invoices',
    'business_software_job_sequences'
  ] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('drop policy if exists bms_member_read on public.%I',tab);
    execute format(
      'create policy bms_member_read on public.%I for select to authenticated using (public.bms_is_active_member(tenant_id))',
      tab
    );
  end loop;
end $$;

alter table public.business_software_users enable row level security;
alter table public.business_software_tenant_settings enable row level security;
alter table public.business_software_tenants enable row level security;

-- Users can see only their own membership record. Administrative user
-- management remains server-side, separately authorised.
drop policy if exists bms_self_membership_read on public.business_software_users;
create policy bms_self_membership_read on public.business_software_users
  for select to authenticated
  using (auth_user_id = (select auth.uid())
         and public.bms_is_active_member(tenant_id));

-- Tenant settings expose business configuration to active members only.
drop policy if exists bms_member_settings_read on public.business_software_tenant_settings;
create policy bms_member_settings_read on public.business_software_tenant_settings
  for select to authenticated using (public.bms_is_active_member(tenant_id));

-- Registry data visible only for tenants of which the caller is a member.
drop policy if exists bms_member_tenant_read on public.business_software_tenants;
create policy bms_member_tenant_read on public.business_software_tenants
  for select to authenticated using (public.bms_is_active_member(id));

commit;
