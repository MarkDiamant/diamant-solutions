-- Isolated BMS acceptance: serialise job creation per tenant and retain unique constraints.
CREATE OR REPLACE FUNCTION public.bms_create_job(p_tenant uuid, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); cid uuid; jid uuid; seq int; ref text; prefix text; begin
 if uid is null or not exists(select 1 from business_software_users where tenant_id=p_tenant and auth_user_id=uid and status='active') then raise exception 'not authorised'; end if;
 cid:=nullif(p_data->>'existingCustomerId','')::uuid;
 if cid is null then insert into business_software_customers(tenant_id,first_name,last_name,phone,email,address_line_1,address_line_2,city,postcode) values(p_tenant,nullif(p_data->>'firstName',''),nullif(p_data->>'lastName',''),nullif(p_data->>'phone',''),nullif(p_data->>'email',''),nullif(p_data->>'addressLine1',''),nullif(p_data->>'addressLine2',''),nullif(p_data->>'city',''),nullif(p_data->>'postcode','')) returning id into cid; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text, 20261110));
 if nullif(p_data->>'historicalSequenceNumber','') is not null then
   seq:=(p_data->>'historicalSequenceNumber')::int;
   if seq < 1 then raise exception 'Historical job number must be positive'; end if;
 else
   insert into business_software_job_sequences(tenant_id,last_number)
   values(p_tenant,(select coalesce(max(sequence_number),0)+1 from business_software_jobs where tenant_id=p_tenant))
   on conflict (tenant_id) do update
     set last_number=greatest(business_software_job_sequences.last_number,excluded.last_number-1)+1,
         updated_at=now()
   returning last_number into seq;
 end if;
 select coalesce(nullif(app_config->>'jobPrefix',''),'JOB') into prefix from business_software_tenant_settings where tenant_id=p_tenant;
 ref:=coalesce(prefix,'JOB')||lpad(seq::text,3,'0');
 insert into business_software_jobs(tenant_id,sequence_number,reference,customer_id,site_address_line_1,site_address_line_2,site_city,site_postcode,job_type,job_types,status,manager,enquiry_source,finishes,colour,dimensions,material,customer_requirements,internal_notes,site_visit_required,preliminary_estimate,quoted_amount,payment_method,next_action,next_action_at,next_action_assignee,scheduled_at)
 values(p_tenant,seq,ref,cid,nullif(p_data->>'siteAddressLine1',''),nullif(p_data->>'siteAddressLine2',''),nullif(p_data->>'siteCity',''),nullif(p_data->>'sitePostcode',''),coalesce(nullif(p_data->>'jobType',''),'Other'),coalesce(array(select jsonb_array_elements_text(coalesce(p_data->'jobTypes','[]'::jsonb))),array[]::text[]),coalesce(nullif(p_data->>'status',''),'new_enquiry'),nullif(p_data->>'manager',''),coalesce(nullif(p_data->>'source',''),'Other'),coalesce(array(select jsonb_array_elements_text(coalesce(p_data->'finishes','[]'::jsonb))),array[]::text[]),nullif(p_data->>'colour',''),nullif(p_data->>'dimensions',''),nullif(p_data->>'material',''),nullif(p_data->>'customerRequirements',''),nullif(p_data->>'jobNotes',''),coalesce((p_data->>'siteVisitRequired')::boolean,false),nullif(p_data->>'preliminaryEstimate','')::numeric,nullif(p_data->>'quotedAmount','')::numeric,nullif(p_data->>'paymentMethod',''),nullif(p_data->>'nextAction',''),nullif(p_data->>'nextActionAt','')::timestamptz,nullif(p_data->>'nextActionAssignee',''),nullif(p_data->>'scheduledAt','')::timestamptz) returning id into jid;
 return jsonb_build_object('job',jsonb_build_object('id',jid,'reference',ref,'sequenceNumber',seq)); end
$function$
;
