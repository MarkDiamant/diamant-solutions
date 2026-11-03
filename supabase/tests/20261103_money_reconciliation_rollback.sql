-- Execute manually against an authorised test database. All fixture writes roll back.
begin;
insert into public.business_software_accounting_unmatched_receipts(tenant_id,provider,external_transaction_id,amount,paid_at,reference)
select tenant_id,'xero','11111111-1111-4111-8111-111111111111',19.95,now(),'ROLLBACK RECONCILIATION TEST' from public.business_software_jobs limit 1;
select public.bms_record_money_decision(j.tenant_id,'xero','11111111-1111-4111-8111-111111111111','in','verified',j.id,null,null,null,'verified test',19.95) from public.business_software_jobs j limit 1;
do $$begin if not exists(select 1 from public.business_software_effective_money_ledger where source_id='11111111-1111-4111-8111-111111111111' and amount=19.95) then raise exception 'Verified receipt absent from effective ledger';end if;end$$;
select public.bms_record_money_decision(j.tenant_id,'xero','11111111-1111-4111-8111-111111111111','in','excluded',null,null,null,null,'exclude test',19.95) from public.business_software_jobs j limit 1;
do $$begin if exists(select 1 from public.business_software_effective_money_ledger where source_id='11111111-1111-4111-8111-111111111111') then raise exception 'Excluded receipt still counted';end if;if (select count(*) from public.business_software_money_decision_history where new_state->>'external_transaction_id'='11111111-1111-4111-8111-111111111111')<>2 then raise exception 'Missing audit history';end if;end$$;
rollback;
