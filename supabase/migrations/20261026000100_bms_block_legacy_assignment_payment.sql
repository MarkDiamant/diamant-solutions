-- Shared BMS: eliminate non-idempotent legacy payment writes.
-- Preserve existing assignment update semantics and all historical financial rows.
CREATE OR REPLACE FUNCTION public.bms_update_assignment(
 p_tenant uuid, p_reference text, p_assignment uuid, p_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); jid uuid; out jsonb;
BEGIN
 IF p_data ? 'add_payment' THEN
   RAISE EXCEPTION 'Use dedicated idempotent subcontractor payment endpoint';
 END IF;
 IF uid IS NULL OR NOT EXISTS (
   SELECT 1 FROM business_software_users
   WHERE tenant_id=p_tenant AND auth_user_id=uid AND status='active'
 ) THEN RAISE EXCEPTION 'not authorised'; END IF;
 SELECT id INTO jid FROM business_software_jobs
 WHERE tenant_id=p_tenant AND upper(reference)=upper(p_reference);
 UPDATE business_software_job_people SET
 status=coalesce(nullif(p_data->>'status',''),status),
 scope=CASE WHEN p_data?'scope' THEN nullif(p_data->>'scope','') ELSE scope END,
 materials_included=CASE WHEN p_data?'materials_included' THEN (p_data->>'materials_included')::boolean ELSE materials_included END,
 agreed_cost=CASE WHEN p_data?'agreed_cost' THEN nullif(p_data->>'agreed_cost','')::numeric ELSE agreed_cost END,
 deposit_amount=CASE WHEN p_data?'deposit_amount' THEN nullif(p_data->>'deposit_amount','')::numeric ELSE deposit_amount END,
 paid_amount=CASE WHEN p_data?'paid_amount' THEN coalesce(nullif(p_data->>'paid_amount','')::numeric,paid_amount) ELSE paid_amount END,
 scheduled_at=CASE WHEN p_data?'scheduled_at' THEN nullif(p_data->>'scheduled_at','')::timestamptz ELSE scheduled_at END,
 completed_at=CASE WHEN p_data?'completed_at' THEN nullif(p_data->>'completed_at','')::timestamptz ELSE completed_at END
 WHERE tenant_id=p_tenant AND job_id=jid AND id=p_assignment
 RETURNING to_jsonb(business_software_job_people.*) INTO out;
 RETURN jsonb_build_object('assignment',out);
END
$function$;
