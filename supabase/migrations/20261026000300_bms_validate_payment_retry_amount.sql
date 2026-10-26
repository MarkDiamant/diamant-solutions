-- Shared BMS. Reject changed payment amount on reuse of an idempotency key.
CREATE OR REPLACE FUNCTION public.bms_record_subcontractor_payment(p_tenant uuid, p_assignment uuid, p_amount numeric, p_paid_at timestamp with time zone, p_counterparty text, p_request_key text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare a record;existing uuid;payment uuid;begin
 if p_amount is null or p_amount<=0 or p_amount>100000000 or p_request_key is null or length(p_request_key)<8 then raise exception 'Invalid payment request';end if;
 select id,job_id,paid_amount into a from public.business_software_job_people
 where id=p_assignment and tenant_id=p_tenant for update;
 if not found then raise exception 'Assignment not found';end if;
 insert into public.business_software_subcontractor_payment_keys(tenant_id,assignment_id,request_key)
 values(p_tenant,p_assignment,p_request_key) on conflict do nothing;
 select payment_id into existing from public.business_software_subcontractor_payment_keys
 where tenant_id=p_tenant and assignment_id=p_assignment and request_key=p_request_key for update;
 if existing is not null then if not exists (select 1 from public.business_software_payments where id=existing and tenant_id=p_tenant and job_id=a.job_id and amount=p_amount and direction='subcontractor_out') then raise exception 'Idempotency key reused with different payment details'; end if; return existing;end if;
 insert into public.business_software_payments(tenant_id,job_id,direction,payment_type,amount,counterparty,paid_at,notes)
 values(p_tenant,a.job_id,'subcontractor_out','Subcontractor payment',p_amount,p_counterparty,p_paid_at,'Assignment '||p_assignment::text||' · idempotency '||p_request_key)
 returning id into payment;
 update public.business_software_job_people set paid_amount=coalesce(paid_amount,0)+p_amount
 where id=p_assignment and tenant_id=p_tenant;
 update public.business_software_subcontractor_payment_keys set payment_id=payment
 where tenant_id=p_tenant and assignment_id=p_assignment and request_key=p_request_key;
 return payment;
end $function$
;
