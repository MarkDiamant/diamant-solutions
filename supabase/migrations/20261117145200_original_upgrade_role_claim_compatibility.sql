BEGIN;
GRANT SELECT ON TABLE public.tenants TO service_role;
DO $repair$
DECLARE r record; old_guard text := 'coalesce(current_setting(''request.jwt.claim.role'',true),'''')'; new_guard text := 'coalesce(nullif(current_setting(''request.jwt.claims'',true),'''')::jsonb->>''role'',current_setting(''request.jwt.claim.role'',true),'''')'; n integer := 0;
BEGIN
 FOR r IN SELECT p.oid, pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' AND p.proname IN ('bms_original_upgrade_binding','bms_original_upgrade_begin','bms_original_upgrade_record','bms_original_upgrade_commit','bms_original_upgrade_observe','bms_prepare_paid_onboarding_tenant') LOOP
  IF position(old_guard in r.definition)=0 THEN RAISE EXCEPTION 'Role guard source changed for %', r.oid::regprocedure; END IF;
  EXECUTE replace(r.definition,old_guard,new_guard);
  n:=n+1;
 END LOOP;
 IF n<>6 THEN RAISE EXCEPTION 'Expected six original upgrade/preparation functions, found %',n; END IF;
END
$repair$;
COMMIT;
