-- Link Xero sales invoices only when the job reference and customer identity match.
create or replace function public.bms_link_xero_customer_invoice(
 p_tenant_id uuid,p_job_id uuid,p_reference text,p_xero_invoice_id text,
 p_xero_contact_id text,p_xero_contact_name text,p_total numeric,
 p_amount_due numeric,p_amount_paid numeric,p_amount_credited numeric,
 p_status text,p_invoice_number text
) returns jsonb language plpgsql security invoker set search_path=public as $bms$
declare
 v_job record;
 v_customer record;
 v_existing record;
 v_invoice_id uuid;
 v_contact_name text;
begin
 if p_xero_invoice_id is null or p_xero_invoice_id !~* '^[a-f0-9-]{36}$' then raise exception 'Invalid Xero invoice ID'; end if;
 if p_total is null or p_amount_due is null or p_amount_paid is null or p_amount_credited is null
 or p_total < 0 or p_amount_due < 0 or p_amount_paid < 0 or p_amount_credited < 0
 or abs(p_total-p_amount_due-p_amount_paid-p_amount_credited)>0.02 then raise exception 'Xero invoice totals do not reconcile'; end if;
 if upper(coalesce(p_status,'')) in ('VOIDED','DELETED','DRAFT','SUBMITTED') then raise exception 'Xero invoice not authorised'; end if;
 if upper(coalesce(p_status,''))='PAID' and p_amount_due>0.01 then raise exception 'Xero invoice marked PAID with outstanding balance'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':invoice:' || lower(p_xero_invoice_id),0));
 select id,job_id into v_existing from public.business_software_invoices
 where tenant_id=p_tenant_id and provider='xero' and lower(external_invoice_id)=lower(p_xero_invoice_id) limit 1;
 if found then
  if v_existing.job_id is distinct from p_job_id then raise exception 'Xero invoice linked to another job'; end if;
  return jsonb_build_object('ok',true,'already_linked',true,'invoice_id',v_existing.id);
 end if;
 select id,customer_id,reference into v_job from public.business_software_jobs
 where tenant_id=p_tenant_id and id=p_job_id and upper(trim(reference))=upper(trim(p_reference)) limit 1;
 if not found then raise exception 'Job reference does not match'; end if;
 if (select count(*) from public.business_software_jobs where tenant_id=p_tenant_id and upper(trim(reference))=upper(trim(p_reference)))<>1 then
  raise exception 'Ambiguous job reference';
 end if;
 select first_name,last_name,xero_contact_id into v_customer from public.business_software_customers
 where id=v_job.customer_id and tenant_id=p_tenant_id limit 1;
 if not found then raise exception 'Job customer missing'; end if;
 v_contact_name:=lower(regexp_replace(trim(coalesce(v_customer.first_name,'')||' '||coalesce(v_customer.last_name,'')),'[^a-zA-Z0-9]','','g'));
 if v_customer.xero_contact_id is not null and length(trim(v_customer.xero_contact_id))>0 then
  if lower(v_customer.xero_contact_id)<>lower(coalesce(p_xero_contact_id,'')) then raise exception 'Xero contact ID mismatch'; end if;
 elsif length(v_contact_name)<4 or v_contact_name<>lower(regexp_replace(coalesce(p_xero_contact_name,''),'[^a-zA-Z0-9]','','g')) then
  raise exception 'Customer name does not match Xero contact';
 end if;
 insert into public.business_software_invoices
 (tenant_id,job_id,provider,external_invoice_id,invoice_number,status,total,amount_due,amount_paid,currency_code,synced_at)
 values (p_tenant_id,p_job_id,'xero',p_xero_invoice_id,p_invoice_number,p_status,p_total,p_amount_due,p_amount_paid,'GBP',now())
 returning id into v_invoice_id;
 return jsonb_build_object('ok',true,'already_linked',false,'invoice_id',v_invoice_id);
end $bms$;
revoke all on function public.bms_link_xero_customer_invoice(uuid,uuid,text,text,text,text,numeric,numeric,numeric,numeric,text,text) from public,anon,authenticated;
grant execute on function public.bms_link_xero_customer_invoice(uuid,uuid,text,text,text,text,numeric,numeric,numeric,numeric,text,text) to service_role;
