create or replace function public.bms_update_invoice_notes_atomic(p_tenant_id uuid,p_invoice_id uuid,p_notes text,p_actor text)
returns table(invoice_notes text,changed boolean)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v public.business_software_invoices%rowtype; v_new text;
begin
 if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;
 if p_tenant_id is null or p_invoice_id is null or p_notes is null or length(p_notes)>5000 or nullif(trim(p_actor),'') is null then raise exception 'Invalid invoice notes update'; end if;
 select * into v from public.business_software_invoices where tenant_id=p_tenant_id and id=p_invoice_id for update;
 if not found then raise exception 'Invoice not found in tenant'; end if;
 if v.provider is distinct from 'bms' or upper(coalesce(v.status,'')) not in ('DRAFT','SUBMITTED') then raise exception 'Invoice is issued, external or locked'; end if;
 v_new:=trim(p_notes);
 if coalesce(v.invoice_notes,'')=v_new then return query select v_new,false;return;end if;
 update public.business_software_invoices set invoice_notes=v_new where tenant_id=p_tenant_id and id=p_invoice_id;
 insert into public.business_software_audit_events(tenant_id,actor,action,entity_type,entity_id,metadata)
 values(p_tenant_id,p_actor,'invoice_notes_updated','invoice',p_invoice_id::text,jsonb_build_object('previous_notes',coalesce(v.invoice_notes,''),'updated_notes',v_new));
 return query select v_new,true;
end $$;
revoke all on function public.bms_update_invoice_notes_atomic(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.bms_update_invoice_notes_atomic(uuid,uuid,text,text) to service_role;
