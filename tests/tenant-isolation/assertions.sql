-- CI-only synthetic identities and records. Never run on production.
insert into auth.users values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
insert into public.business_software_tenants(id,slug,status) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','tenant-a','active'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','tenant-b','active');
insert into public.business_software_users(id,tenant_id,auth_user_id,status,role) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','active','owner'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','active','owner');
insert into public.business_software_tenant_settings(tenant_id,business_name) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Synthetic A'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Synthetic B');
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
  execute format('insert into public.%I(id,tenant_id) values ($1,$2),($3,$4)',tab)
  using 'aaaaaaaa-aaaa-4aaa-8aaa-000000000003'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'bbbbbbbb-bbbb-4bbb-8bbb-000000000004'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid;
 end loop;
end $$;
grant usage on schema public to authenticated,anon;
grant select on all tables in schema public to authenticated,anon;
-- Grant table INSERT to prove denial comes from RLS, not missing SQL privileges.
grant insert on public.business_software_customers to authenticated;
grant usage on schema auth to authenticated,anon;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$
declare tab text; n integer;
begin
 if not public.bms_is_active_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)
    or public.bms_is_active_member('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid)
 then raise exception 'Tenant membership isolation failed'; end if;
 foreach tab in array array[
  'business_software_customers','business_software_jobs','business_software_activities',
  'business_software_people','business_software_job_people','business_software_payments',
  'business_software_job_costs','business_software_quotes','business_software_files',
  'business_software_suppliers','business_software_material_orders','business_software_invoices',
  'business_software_job_sequences'
 ] loop
  execute format('select count(*) from public.%I',tab) into n;
  if n <> 1 then raise exception 'RLS isolation failed for %, visible %',tab,n; end if;
 end loop;
 select count(*) into n from public.business_software_tenants;
 if n <> 1 then raise exception 'Tenant registry isolation failed'; end if;
 select count(*) into n from public.business_software_users;
 if n <> 1 then raise exception 'User membership isolation failed'; end if;
 select count(*) into n from public.business_software_tenant_settings;
 if n <> 1 then raise exception 'Tenant settings isolation failed'; end if;
end $$;
-- Both own-tenant and cross-tenant writes remain denied until reviewed
-- role-specific mutation policies are introduced.
do $
begin
 begin
  insert into public.business_software_customers(id,tenant_id) values
   ('aaaaaaaa-aaaa-4aaa-8aaa-000000000099','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  raise exception 'Own-tenant INSERT unexpectedly succeeded';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.business_software_customers(id,tenant_id) values
   ('bbbbbbbb-bbbb-4bbb-8bbb-000000000099','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  raise exception 'Cross-tenant INSERT unexpectedly succeeded';
 exception when insufficient_privilege then null;
 end;
end $;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
do $$
declare n integer;
begin
 select count(*) into n from public.business_software_customers;
 if n <> 0 then raise exception 'Unknown user could read customer data'; end if;
 select count(*) into n from public.business_software_users;
 if n <> 0 then raise exception 'Unknown user could read memberships'; end if;
end $$;
reset role;
set role anon;
do $$
declare n integer;
begin
 select count(*) into n from public.business_software_customers;
 if n <> 0 then raise exception 'Anonymous user could read customer data'; end if;
end $$;
reset role;
