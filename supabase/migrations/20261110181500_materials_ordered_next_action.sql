CREATE OR REPLACE FUNCTION public.bms_ensure_job_next_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare default_action text; default_due timestamptz;
begin
 if lower(coalesce(new.status,'')) in ('completed','declined','cancelled','canceled','lost','dormant_enquiry') or new.archived_at is not null then
   new.next_action:=null; new.next_action_at:=null; return new;
 end if;
 default_action:=case new.status
 when 'awaiting_customer' then 'Follow up customer'
 when 'awaiting_information' then 'Follow up outstanding information'
 when 'interested_not_ready' then 'Check customer readiness'
 when 'pricing_up' then 'Prepare quote'
 when 'estimate_preparing' then 'Prepare estimate'
 when 'quote_preparing' then 'Send quote'
 when 'quote_sent' then 'Follow up quote'
 when 'site_visit_required' then 'Arrange site visit'
 when 'site_visit_booked' then 'Complete site visit'
 when 'confirmed' then 'Confirm deposit and schedule works'
 when 'deposit_requested' then 'Follow up deposit'
 when 'materials_ordered' then 'Confirm materials delivery and schedule works'
 when 'in_progress' then 'Check progress and confirm next step'
 when 'on_hold' then 'Review job on hold'
 else 'Review job and agree next action' end;
 if new.next_action is null or btrim(new.next_action)='' or
    (tg_op='UPDATE' and new.status is distinct from old.status and new.next_action is not distinct from old.next_action) then
    new.next_action:=default_action;
    if tg_op='UPDATE' and new.status is distinct from old.status then new.next_action_at:=null; end if;
 end if;
 if new.next_action_at is null then
    default_due:=(current_date + (case when new.status in ('in_progress','materials_ordered','site_visit_required','site_visit_booked','pricing_up','quote_preparing','estimate_preparing') then 1 else 3 end) + time '09:00') at time zone 'Europe/London';
    new.next_action_at:=default_due;
 end if;
 return new;
end
$function$
;
