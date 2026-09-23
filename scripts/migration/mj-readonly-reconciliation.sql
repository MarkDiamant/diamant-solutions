-- M&J production: read-only pre-migration reconciliation.
-- Run in a single REPEATABLE READ, READ ONLY transaction to avoid
-- mixing snapshots while the live application continues to change.
-- Do not use these counts as a backup or export customer records.
begin transaction isolation level repeatable read read only;
select now() as captured_at,current_database() as source_database,
       pg_size_pretty(pg_database_size(current_database())) as source_database_size;
select 'mj_admin_users' table_name,count(*) records from public.mj_admin_users
union all select 'mj_customers',count(*) from public.mj_customers
union all select 'mj_jobs',count(*) from public.mj_jobs
union all select 'mj_activities',count(*) from public.mj_activities
union all select 'mj_subcontractors',count(*) from public.mj_subcontractors
union all select 'mj_job_subcontractors',count(*) from public.mj_job_subcontractors
union all select 'mj_payments',count(*) from public.mj_payments
union all select 'mj_job_costs',count(*) from public.mj_job_costs
union all select 'mj_quotes',count(*) from public.mj_quotes
union all select 'mj_files',count(*) from public.mj_files
union all select 'mj_integration_events',count(*) from public.mj_integration_events
union all select 'mj_suppliers',count(*) from public.mj_suppliers
union all select 'mj_material_orders',count(*) from public.mj_material_orders
union all select 'mj_audit_events',count(*) from public.mj_audit_events
union all select 'mj_xero_connection',count(*) from public.mj_xero_connection
union all select 'mj_xero_invoices',count(*) from public.mj_xero_invoices
order by table_name;
select direction,count(*) records,coalesce(sum(amount),0) amount
from public.mj_payments group by direction order by direction;
select count(*) records,coalesce(sum(actual_amount),0) actual_amount,
coalesce(sum(estimated_amount),0) estimated_amount,
coalesce(sum(paid_amount),0) paid_amount
from public.mj_job_costs;
select count(*) records,coalesce(sum(amount),0) quote_amount
from public.mj_quotes;
select count(*) records,count(distinct reference) unique_references,
count(distinct sequence_number) unique_sequences from public.mj_jobs;
select
 (select count(*) from auth.users) auth_users,
 (select count(*) from public.mj_jobs j left join public.mj_customers c on c.id=j.customer_id
   where j.customer_id is not null and c.id is null) orphan_jobs,
 (select count(*) from public.mj_payments p left join public.mj_jobs j on j.id=p.job_id
   where p.job_id is not null and j.id is null) orphan_payments,
 (select count(*) from public.mj_files f left join public.mj_jobs j on j.id=f.job_id
   where f.job_id is not null and j.id is null) orphan_files,
 (select count(*) from public.mj_job_costs p left join public.mj_jobs j on j.id=p.job_id
   where p.job_id is not null and j.id is null) orphan_costs,
 (select count(*) from public.mj_job_subcontractors p left join public.mj_jobs j on j.id=p.job_id
   where p.job_id is not null and j.id is null) orphan_assignments,
 (select count(*) from public.mj_quotes p left join public.mj_jobs j on j.id=p.job_id
   where p.job_id is not null and j.id is null) orphan_quotes;
select b.id as bucket,b.public,count(o.id) as objects,
 coalesce(sum(nullif(o.metadata->>'size','')::bigint),0) metadata_bytes,
 count(o.id) filter (where f.id is null) unreferenced_objects
from storage.buckets b
left join storage.objects o on o.bucket_id=b.id
left join public.mj_files f on f.storage_path=o.name and b.id='mj-job-files'
where b.id='mj-job-files'
group by b.id,b.public;
commit;
