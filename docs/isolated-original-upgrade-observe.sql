
CREATE OR REPLACE FUNCTION public.bms_original_upgrade_observe(p_id text,p_event text,p_invoice text,p_state text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bms_original_subscription_upgrades;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
 SELECT * INTO r FROM public.bms_original_subscription_upgrades WHERE operation_id=p_id FOR UPDATE;
 IF NOT FOUND OR r.invoice_id IS DISTINCT FROM p_invoice OR coalesce(p_event,'') NOT LIKE 'evt_%' OR coalesce(p_state,'') NOT IN ('pending','expired','failed') THEN RAISE EXCEPTION 'Observation binding mismatch'; END IF;
 IF r.state='paid_applied' THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.bms_original_subscription_upgrade_events WHERE event_id=p_event) THEN RETURN false; END IF;
 UPDATE public.bms_original_subscription_upgrades SET state=p_state,updated_at=now() WHERE operation_id=p_id;
 INSERT INTO public.bms_original_subscription_upgrade_events(event_id,operation_id,invoice_id,event_type) VALUES(p_event,p_id,p_invoice,'verified_'||p_state);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.bms_original_upgrade_observe(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_original_upgrade_observe(text,text,text,text) TO service_role;
