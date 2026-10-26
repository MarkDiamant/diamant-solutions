-- Prevent linking a job to a subcontractor record belonging to another tenant.
CREATE OR REPLACE FUNCTION public.bms_job_action(p_tenant uuid, p_reference text, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); jid uuid; typ text:=p_data->>'type'; item jsonb; pid uuid; begin
 if uid is null or not exists(select 1 from business_software_users where tenant_id=p_tenant and auth_user_id=uid and status='active') then raise exception 'not authorised'; end if;
 if typ in ('activity','quote','cost','material_order','subcontractor') and not exists (
  select 1 from business_software_users u
  where u.tenant_id=p_tenant and u.auth_user_id=uid and u.status='active'
    and (
      (jsonb_typeof(u.permissions)='array' and
        u.permissions ? case
          when typ='cost' then 'view_costs_profit'
          when typ='material_order' then 'manage_purchasing'
          when typ='subcontractor' then 'manage_workforce'
          else 'edit_jobs' end
        and (typ <> 'cost' or u.permissions ? 'edit_jobs'))
      or ((u.permissions is null or u.permissions='[]'::jsonb) and u.role in ('admin','manager','owner'))
    )
 ) then raise exception 'Insufficient permission for job action'; end if;
 select id into jid from business_software_jobs where tenant_id=p_tenant and upper(reference)=upper(p_reference); if jid is null then raise exception 'job not found'; end if;
 if typ='activity' then insert into business_software_activities(tenant_id,job_id,activity_type,actor,summary,details,occurred_at,next_action_at) values(p_tenant,jid,coalesce(nullif(p_data->>'activity_type',''),'note'),coalesce((select legacy_manager_initials from business_software_users where tenant_id=p_tenant and auth_user_id=uid),''),nullif(p_data->>'summary',''),nullif(p_data->>'details',''),now(),nullif(p_data->>'next_action_at','')::timestamptz) returning to_jsonb(business_software_activities.*) into item;
 elsif typ='quote' then
   perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||jid::text,0));
   if nullif(p_data->>'quote_id','') is not null then
    insert into business_software_quotes(tenant_id,job_id,version,status,scope_text,exclusions,amount,deposit_amount,vat_rate,lead_time,valid_until,created_by)
    select p_tenant,jid,coalesce((select max(version)+1 from business_software_quotes where tenant_id=p_tenant and job_id=jid),1),'draft',
      case when p_data ? 'scope_text' then nullif(p_data->>'scope_text','') else q.scope_text end,
      case when p_data ? 'exclusions' then nullif(p_data->>'exclusions','') else q.exclusions end,
      coalesce(nullif(p_data->>'amount','')::numeric,q.amount),
      case when p_data ? 'deposit_amount' then nullif(p_data->>'deposit_amount','')::numeric else q.deposit_amount end,
      coalesce(nullif(p_data->>'vat_rate','')::numeric,q.vat_rate),
      coalesce(nullif(p_data->>'lead_time',''),q.lead_time,(select quote_default_lead_time from business_software_tenant_settings where tenant_id=p_tenant),'10 days'),
      case when p_data ? 'valid_until' then nullif(p_data->>'valid_until','')::date else q.valid_until end,
      (select display_name from business_software_users where tenant_id=p_tenant and auth_user_id=uid)
    from business_software_quotes q where q.id=(p_data->>'quote_id')::uuid and q.tenant_id=p_tenant and q.job_id=jid
    returning to_jsonb(business_software_quotes.*) into item;
    if item is null then raise exception 'quote not found';end if;
   else insert into business_software_quotes(tenant_id,job_id,version,status,scope_text,exclusions,amount,deposit_amount,vat_rate,lead_time,valid_until,created_by) values(p_tenant,jid,coalesce((select max(version)+1 from business_software_quotes where tenant_id=p_tenant and job_id=jid),1),'draft',nullif(p_data->>'scope_text',''),nullif(p_data->>'exclusions',''),nullif(p_data->>'amount','')::numeric,nullif(p_data->>'deposit_amount','')::numeric,coalesce(nullif(p_data->>'vat_rate','')::numeric,0),coalesce(nullif(p_data->>'lead_time',''),(select quote_default_lead_time from business_software_tenant_settings where tenant_id=p_tenant),'10 days'),nullif(p_data->>'valid_until','')::date,(select display_name from business_software_users where tenant_id=p_tenant and auth_user_id=uid)) returning to_jsonb(business_software_quotes.*) into item; end if;
   update business_software_jobs set quoted_amount=(item->>'amount')::numeric,updated_at=now() where id=jid;
 elsif typ='payment' then if not exists(select 1 from business_software_users where tenant_id=p_tenant and auth_user_id=uid and status='active' and ((jsonb_typeof(permissions)='array' and permissions ? 'edit_jobs' and permissions ? 'view_payments_invoices') or ((permissions is null or permissions='[]'::jsonb) and role in ('admin','manager','owner')))) then raise exception 'Payment management permission required'; end if; if lower(coalesce(p_data->>'direction',''))='subcontractor_out' or lower(coalesce(p_data->>'payment_type','')) like '%subcontractor%' then raise exception 'Subcontractor payments require assignment-linked idempotency'; end if; insert into business_software_payments(tenant_id,job_id,direction,payment_type,amount,payment_method,counterparty,paid_at,due_at,notes) values(p_tenant,jid,coalesce(nullif(p_data->>'direction',''),'customer_in'),nullif(p_data->>'payment_type',''),nullif(p_data->>'amount','')::numeric,nullif(p_data->>'payment_method',''),nullif(p_data->>'counterparty',''),nullif(p_data->>'paid_at','')::timestamptz,nullif(p_data->>'due_at','')::timestamptz,nullif(p_data->>'notes','')) returning to_jsonb(business_software_payments.*) into item;
 elsif typ='cost' then insert into business_software_job_costs(tenant_id,job_id,category,supplier,estimated_amount,actual_amount,paid_amount,paid_at,due_at,notes) values(p_tenant,jid,nullif(p_data->>'category',''),nullif(p_data->>'supplier',''),nullif(p_data->>'estimated_amount','')::numeric,nullif(p_data->>'actual_amount','')::numeric,coalesce(nullif(p_data->>'paid_amount','')::numeric,0),nullif(p_data->>'paid_at','')::timestamptz,nullif(p_data->>'due_at','')::timestamptz,nullif(p_data->>'notes','')) returning to_jsonb(business_software_job_costs.*) into item;
 elsif typ='material_order' then insert into business_software_material_orders(tenant_id,job_id,supplier_name,description,amount,ordered_at,expected_at,status,notes) values(p_tenant,jid,nullif(p_data->>'supplier_name',''),nullif(p_data->>'description',''),nullif(p_data->>'amount','')::numeric,nullif(p_data->>'ordered_at','')::timestamptz,nullif(p_data->>'expected_at','')::timestamptz,'ordered',nullif(p_data->>'notes','')) returning to_jsonb(business_software_material_orders.*) into item;
 elsif typ='subcontractor' then pid:=nullif(p_data->>'subcontractor_id','')::uuid; if pid is not null and not exists (select 1 from business_software_people where tenant_id=p_tenant and id=pid) then raise exception 'Subcontractor not found in tenant'; end if; if pid is null then insert into business_software_people(tenant_id,name,company,phone,email,capabilities,relationship_type,active) values(p_tenant,nullif(p_data->>'name',''),nullif(p_data->>'company',''),nullif(p_data->>'phone',''),nullif(p_data->>'email',''),string_to_array(coalesce(p_data->>'capabilities',''),','),coalesce(nullif(p_data->>'relationship_type',''),'subcontractor'),true) returning id into pid; end if; insert into business_software_job_people(tenant_id,job_id,person_id,scope,assignment_role,agreed_cost,materials_included,scheduled_at,status) values(p_tenant,jid,pid,nullif(p_data->>'scope',''),nullif(p_data->>'assignment_role',''),nullif(p_data->>'agreed_cost','')::numeric,coalesce((p_data->>'materials_included')::boolean,false),nullif(p_data->>'scheduled_at','')::timestamptz,'assigned') returning to_jsonb(business_software_job_people.*) into item;
 else raise exception 'unsupported action'; end if;
 return jsonb_build_object('item',item); end $function$
