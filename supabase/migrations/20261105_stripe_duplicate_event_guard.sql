-- Prevent duplicate signed Stripe webhook replays from causing repeated billing mutations or endless 503 retries.
do $migration$
declare fn text;
begin
 select pg_get_functiondef(p.oid) into fn from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='bms_apply_verified_seat_billing_event';
 if fn is null or position($needle$perform pg_advisory_xact_lock(hashtextextended('seat-billing:'||p_tenant::text,0));$needle$ in fn)=0 then raise exception 'Billing function signature changed'; end if;
 if position('where event_id=p_event_id' in fn)>0 then return; end if;
 fn:=replace(fn,$needle$perform pg_advisory_xact_lock(hashtextextended('seat-billing:'||p_tenant::text,0));$needle$,$replacement$perform pg_advisory_xact_lock(hashtextextended('seat-billing:'||p_tenant::text,0)); if exists(select 1 from public.business_software_subscription_event_log where event_id=p_event_id) then return false; end if;$replacement$);
 execute fn;
end $migration$;
