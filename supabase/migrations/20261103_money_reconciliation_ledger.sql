-- Reconciliation overlay: preserve the source payment ledger and append every correction.
create table if not exists public.business_software_money_decisions(id uuid primary key default gen_random_uuid(),tenant_id uuid not null,provider text not null default 'xero',external_transaction_id text not null,direction text not null check(direction in ('in','out')),status text not null check(status in ('review','assigned','verified','non_job','excluded')),job_id uuid,invoice_id uuid,subcontractor_assignment_id uuid,actor_id uuid,reason text,amount numeric not null,updated_at timestamptz not null default now(),unique(tenant_id,provider,external_transaction_id));
create table if not exists public.business_software_money_decision_history(id uuid primary key default gen_random_uuid(),decision_id uuid not null references public.business_software_money_decisions(id),tenant_id uuid not null,actor_id uuid,previous_state jsonb,new_state jsonb not null,changed_at timestamptz not null default now());
alter table public.business_software_money_decisions enable row level security;
alter table public.business_software_money_decision_history enable row level security;
revoke all on public.business_software_money_decisions from anon,authenticated;
revoke all on public.business_software_money_decision_history from anon,authenticated;
CREATE OR REPLACE FUNCTION public.bms_record_money_decision(p_tenant uuid, p_provider text, p_external text, p_direction text, p_status text, p_job uuid, p_invoice uuid, p_assignment uuid, p_actor uuid, p_reason text, p_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ declare old_row public.business_software_money_decisions%rowtype; new_row public.business_software_money_decisions%rowtype; begin if p_provider<>'xero' or p_direction not in ('in','out') or p_status not in ('review','assigned','verified','non_job','excluded') or p_amount<=0 or length(p_external)<8 then raise exception 'Invalid reconciliation input';end if; if p_job is not null and not exists(select 1 from public.business_software_jobs where tenant_id=p_tenant and id=p_job) then raise exception 'Job not in tenant';end if;if p_invoice is not null and not exists(select 1 from public.business_software_invoices where tenant_id=p_tenant and id=p_invoice and (p_job is null or job_id=p_job)) then raise exception 'Invoice not in job';end if;if p_assignment is not null and p_job is null then raise exception 'Subcontractor assignment requires a job';end if;if p_assignment is not null and not exists(select 1 from public.business_software_job_people where tenant_id=p_tenant and id=p_assignment and (p_job is null or job_id=p_job)) then raise exception 'Assignment not in job';end if;select * into old_row from public.business_software_money_decisions where tenant_id=p_tenant and provider=p_provider and external_transaction_id=p_external for update;if old_row.id is not null and (old_row.amount<>p_amount or old_row.direction<>p_direction) then raise exception 'Transaction amount and direction cannot change; reconcile the original source';end if;insert into public.business_software_money_decisions(tenant_id,provider,external_transaction_id,direction,status,job_id,invoice_id,subcontractor_assignment_id,actor_id,reason,amount) values(p_tenant,p_provider,p_external,p_direction,p_status,p_job,p_invoice,p_assignment,p_actor,p_reason,p_amount) on conflict(tenant_id,provider,external_transaction_id) do update set direction=excluded.direction,status=excluded.status,job_id=excluded.job_id,invoice_id=excluded.invoice_id,subcontractor_assignment_id=excluded.subcontractor_assignment_id,actor_id=excluded.actor_id,reason=excluded.reason,amount=excluded.amount,updated_at=now() returning * into new_row;insert into public.business_software_money_decision_history(decision_id,tenant_id,actor_id,previous_state,new_state) values(new_row.id,p_tenant,p_actor,case when old_row.id is null then null else to_jsonb(old_row) end,to_jsonb(new_row));return to_jsonb(new_row);end $function$

revoke all on function public.bms_record_money_decision(uuid,text,text,text,text,uuid,uuid,uuid,uuid,text,numeric) from public,anon,authenticated;
grant execute on function public.bms_record_money_decision(uuid,text,text,text,text,uuid,uuid,uuid,uuid,text,numeric) to service_role;
create or replace function public.bms_money_history_immutable() returns trigger language plpgsql set search_path=public as $$begin raise exception 'Money reconciliation audit history is append-only';end$$;
drop trigger if exists bms_money_history_no_mutation on public.business_software_money_decision_history;
create trigger bms_money_history_no_mutation before update or delete on public.business_software_money_decision_history for each row execute function public.bms_money_history_immutable();
create index if not exists bms_money_history_tenant_time on public.business_software_money_decision_history(tenant_id,changed_at desc);
create index if not exists bms_money_decisions_tenant_job on public.business_software_money_decisions(tenant_id,job_id);
create or replace view public.business_software_effective_money_ledger with (security_invoker=true) as  SELECT p.tenant_id,
    p.id::text AS source_id,
    p.id AS payment_id,
        CASE
            WHEN d.status = ANY (ARRAY['non_job'::text, 'excluded'::text, 'review'::text]) THEN NULL::uuid
            ELSE COALESCE(d.job_id, p.job_id)
        END AS job_id,
    p.direction,
    p.amount,
    p.paid_at,
    p.payment_type,
    COALESCE(d.status,
        CASE
            WHEN l.verified_at IS NOT NULL THEN 'verified'::text
            ELSE 'recorded'::text
        END) AS reconciliation_status,
    l.external_transaction_id,
    d.subcontractor_assignment_id,
    d.invoice_id,
    'bms'::text AS origin
   FROM business_software_payments p
     LEFT JOIN LATERAL ( SELECT l_1.external_transaction_id,
            l_1.verified_at
           FROM business_software_payment_external_links l_1
          WHERE l_1.tenant_id = p.tenant_id AND l_1.payment_id = p.id AND l_1.provider = 'xero'::text
          ORDER BY l_1.verified_at DESC NULLS LAST
         LIMIT 1) l ON true
     LEFT JOIN business_software_money_decisions d ON d.tenant_id = p.tenant_id AND d.provider = 'xero'::text AND d.external_transaction_id = l.external_transaction_id
UNION ALL
 SELECT d.tenant_id,
    d.external_transaction_id AS source_id,
    NULL::uuid AS payment_id,
    d.job_id,
    'customer_in'::text AS direction,
    d.amount,
    COALESCE(u.paid_at::timestamp with time zone, d.updated_at) AS paid_at,
    'verified_xero_unlinked'::text AS payment_type,
    d.status AS reconciliation_status,
    d.external_transaction_id,
    d.subcontractor_assignment_id,
    d.invoice_id,
    'xero_unlinked'::text AS origin
   FROM business_software_money_decisions d
     JOIN business_software_accounting_unmatched_receipts u ON u.tenant_id = d.tenant_id AND u.provider = d.provider AND u.external_transaction_id = d.external_transaction_id
  WHERE (d.status = 'verified'::text OR d.status = 'assigned'::text AND (EXISTS ( SELECT 1
           FROM business_software_money_decision_history h
          WHERE h.decision_id = d.id AND (h.new_state ->> 'status'::text) = 'verified'::text))) AND d.direction = 'in'::text AND d.job_id IS NOT NULL AND d.invoice_id IS NULL AND NOT (EXISTS ( SELECT 1
           FROM business_software_payment_external_links l
          WHERE l.tenant_id = d.tenant_id AND l.provider = d.provider AND l.external_transaction_id = d.external_transaction_id));
revoke all on public.business_software_effective_money_ledger from anon,authenticated;
grant select on public.business_software_effective_money_ledger to service_role;

-- Atomic linking of Xero evidence to existing BMS records.
alter table public.business_software_money_decisions add column if not exists linked_payment_id uuid;
create unique index if not exists bms_money_linked_payment_once on public.business_software_money_decisions(tenant_id,linked_payment_id) where linked_payment_id is not null;
CREATE OR REPLACE FUNCTION public.bms_attach_money_decision_payment(p_tenant uuid, p_external text, p_payment uuid, p_actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$declare d public.business_software_money_decisions%rowtype;p public.business_software_payments%rowtype;begin select * into d from public.business_software_money_decisions where tenant_id=p_tenant and provider='xero' and external_transaction_id=p_external for update;if d.id is null then raise exception 'Reconciliation decision missing';end if;select * into p from public.business_software_payments where tenant_id=p_tenant and id=p_payment;if p.id is null or abs(p.amount-d.amount)>0.005 or (d.direction='in' and p.direction<>'customer_in') or (d.direction='out' and p.direction<>'subcontractor_out') then raise exception 'Payment tenant, amount or direction mismatch';end if;if d.linked_payment_id is distinct from p_payment then update public.business_software_money_decisions set linked_payment_id=p_payment,actor_id=p_actor,updated_at=now() where id=d.id returning * into d;insert into public.business_software_money_decision_history(decision_id,tenant_id,actor_id,previous_state,new_state) values(d.id,p_tenant,p_actor,to_jsonb(d)-'linked_payment_id'||jsonb_build_object('linked_payment_id',null),to_jsonb(d));end if;return to_jsonb(d);end$function$

CREATE OR REPLACE FUNCTION public.bms_record_money_decision_v2(p_tenant uuid, p_provider text, p_external text, p_direction text, p_status text, p_job uuid, p_invoice uuid, p_assignment uuid, p_actor uuid, p_reason text, p_amount numeric, p_payment uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$declare result jsonb;begin if p_payment is not null then if not exists(select 1 from public.business_software_payments p where p.tenant_id=p_tenant and p.id=p_payment and abs(p.amount-p_amount)<0.005 and ((p_direction='in' and p.direction='customer_in') or (p_direction='out' and p.direction='subcontractor_out'))) then raise exception 'Payment tenant, amount or direction mismatch';end if;end if;result:=public.bms_record_money_decision(p_tenant,p_provider,p_external,p_direction,p_status,p_job,p_invoice,p_assignment,p_actor,p_reason,p_amount);if p_payment is not null then result:=public.bms_attach_money_decision_payment(p_tenant,p_external,p_payment,p_actor);end if;return result;end$function$

revoke all on function public.bms_attach_money_decision_payment(uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.bms_attach_money_decision_payment(uuid,text,uuid,uuid) to service_role;
revoke all on function public.bms_record_money_decision_v2(uuid,text,text,text,text,uuid,uuid,uuid,uuid,text,numeric,uuid) from public,anon,authenticated;
grant execute on function public.bms_record_money_decision_v2(uuid,text,text,text,text,uuid,uuid,uuid,uuid,text,numeric,uuid) to service_role;
create or replace view public.business_software_effective_money_ledger with (security_invoker=true) as  SELECT p.tenant_id,
    p.id::text AS source_id,
    p.id AS payment_id,
        CASE
            WHEN d.status = ANY (ARRAY['non_job'::text, 'excluded'::text, 'review'::text]) THEN NULL::uuid
            ELSE COALESCE(d.job_id, p.job_id)
        END AS job_id,
    p.direction,
    p.amount,
    p.paid_at,
    p.payment_type,
    COALESCE(d.status,
        CASE
            WHEN l.verified_at IS NOT NULL THEN 'verified'::text
            ELSE 'recorded'::text
        END) AS reconciliation_status,
    l.external_transaction_id,
    d.subcontractor_assignment_id,
    d.invoice_id,
    'bms'::text AS origin
   FROM business_software_payments p
     LEFT JOIN LATERAL ( SELECT l_1.external_transaction_id,
            l_1.verified_at
           FROM business_software_payment_external_links l_1
          WHERE l_1.tenant_id = p.tenant_id AND l_1.payment_id = p.id AND l_1.provider = 'xero'::text
          ORDER BY l_1.verified_at DESC NULLS LAST
         LIMIT 1) l ON true
     LEFT JOIN LATERAL ( SELECT d1.id,
            d1.tenant_id,
            d1.provider,
            d1.external_transaction_id,
            d1.direction,
            d1.status,
            d1.job_id,
            d1.invoice_id,
            d1.subcontractor_assignment_id,
            d1.actor_id,
            d1.reason,
            d1.amount,
            d1.updated_at,
            d1.linked_payment_id
           FROM business_software_money_decisions d1
          WHERE d1.tenant_id = p.tenant_id AND d1.provider = 'xero'::text AND (d1.linked_payment_id = p.id OR d1.linked_payment_id IS NULL AND d1.external_transaction_id = l.external_transaction_id)
          ORDER BY (d1.linked_payment_id IS NOT NULL) DESC
         LIMIT 1) d ON true
UNION ALL
 SELECT d.tenant_id,
    d.external_transaction_id AS source_id,
    NULL::uuid AS payment_id,
    d.job_id,
    'customer_in'::text AS direction,
    d.amount,
    COALESCE(u.paid_at::timestamp with time zone, d.updated_at) AS paid_at,
    'verified_xero_unlinked'::text AS payment_type,
    d.status AS reconciliation_status,
    d.external_transaction_id,
    d.subcontractor_assignment_id,
    d.invoice_id,
    'xero_unlinked'::text AS origin
   FROM business_software_money_decisions d
     JOIN business_software_accounting_unmatched_receipts u ON u.tenant_id = d.tenant_id AND u.provider = d.provider AND u.external_transaction_id = d.external_transaction_id
  WHERE (d.status = 'verified'::text OR d.status = 'assigned'::text AND (EXISTS ( SELECT 1
           FROM business_software_money_decision_history h
          WHERE h.decision_id = d.id AND (h.new_state ->> 'status'::text) = 'verified'::text))) AND d.direction = 'in'::text AND d.job_id IS NOT NULL AND d.invoice_id IS NULL AND d.linked_payment_id IS NULL AND NOT (EXISTS ( SELECT 1
           FROM business_software_payment_external_links l
          WHERE l.tenant_id = d.tenant_id AND l.provider = d.provider AND l.external_transaction_id = d.external_transaction_id));

-- Preserve exact previous state for linked-payment corrections.
CREATE OR REPLACE FUNCTION public.bms_attach_money_decision_payment(p_tenant uuid, p_external text, p_payment uuid, p_actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$declare d public.business_software_money_decisions%rowtype;p public.business_software_payments%rowtype;old_state jsonb;begin select * into d from public.business_software_money_decisions where tenant_id=p_tenant and provider='xero' and external_transaction_id=p_external for update;if d.id is null then raise exception 'Reconciliation decision missing';end if;select * into p from public.business_software_payments where tenant_id=p_tenant and id=p_payment;if p.id is null or abs(p.amount-d.amount)>0.005 or (d.direction='in' and p.direction<>'customer_in') or (d.direction='out' and p.direction<>'subcontractor_out') then raise exception 'Payment tenant, amount or direction mismatch';end if;if d.linked_payment_id is distinct from p_payment then old_state:=to_jsonb(d);update public.business_software_money_decisions set linked_payment_id=p_payment,actor_id=p_actor,updated_at=now() where id=d.id returning * into d;insert into public.business_software_money_decision_history(decision_id,tenant_id,actor_id,previous_state,new_state) values(d.id,p_tenant,p_actor,old_state,to_jsonb(d));end if;return to_jsonb(d);end$function$

