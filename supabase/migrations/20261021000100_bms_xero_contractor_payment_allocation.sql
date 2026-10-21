-- Idempotent, tenant-scoped Xero contractor payment posting.
-- Requires service-role credentials. Each Xero PaymentID is posted at most once.
create or replace function public.bms_post_xero_contractor_payment(
 p_tenant_id uuid,
 p_job_id uuid,
 p_assignment_id uuid,
 p_xero_payment_id text,
 p_amount numeric,
 p_paid_at timestamptz,
 p_counterparty text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_assignment record;
 v_payment_id uuid;
 v_marker text;
 v_current numeric;
begin
 if auth.role() <> 'service_role' then
  raise exception 'Service role required';
 end if;
 if p_xero_payment_id is null or p_xero_payment_id !~* '^[a-f0-9-]{36}$' then
  raise exception 'Invalid Xero payment identifier';
 end if;
 if p_amount is null or p_amount <= 0 or p_amount > 100000000 then
  raise exception 'Invalid contractor payment amount';
 end if;
 if p_paid_at is null then
  raise exception 'Xero payment date is required';
 end if;
 v_marker := 'XERO_PAYMENT_ID:' || lower(p_xero_payment_id);
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':' || v_marker, 0));
 select id into v_payment_id from public.business_software_payments
 where tenant_id=p_tenant_id and direction='subcontractor_out' and notes=v_marker limit 1;
 if found then
  return jsonb_build_object('ok',true,'already_posted',true,'payment_id',v_payment_id);
 end if;
 select id,job_id,person_id,agreed_cost,paid_amount into v_assignment
 from public.business_software_job_people
 where id=p_assignment_id and tenant_id=p_tenant_id and job_id=p_job_id for update;
 if not found then raise exception 'Assignment does not belong to tenant and job'; end if;
 v_current := coalesce(v_assignment.paid_amount,0);
 if v_assignment.agreed_cost is not null and v_current+p_amount > v_assignment.agreed_cost+0.02 then
  raise exception 'Payment would exceed assigned contractor cost';
 end if;
 insert into public.business_software_payments
 (tenant_id,job_id,direction,payment_type,amount,counterparty,paid_at,notes)
 values (p_tenant_id,p_job_id,'subcontractor_out','Subcontractor payment',p_amount,p_counterparty,p_paid_at,v_marker)
 returning id into v_payment_id;
 update public.business_software_job_people
 set paid_amount=v_current+p_amount where id=p_assignment_id and tenant_id=p_tenant_id;
 return jsonb_build_object('ok',true,'already_posted',false,'payment_id',v_payment_id);
end $$;
revoke all on function public.bms_post_xero_contractor_payment(uuid,uuid,uuid,text,numeric,timestamptz,text) from public,anon,authenticated;
grant execute on function public.bms_post_xero_contractor_payment(uuid,uuid,uuid,text,numeric,timestamptz,text) to service_role;
