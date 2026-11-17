-- Proposed, not applied to production. Does not update any existing row.
BEGIN;
CREATE OR REPLACE FUNCTION public.build_onboarding_proposed_config()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $function$
BEGIN
 IF NEW.status = 'submitted' AND (OLD.status IS DISTINCT FROM NEW.status OR NEW.proposed_config IS NULL) THEN
  IF current_user IN ('postgres','service_role') AND NEW.proposed_config->>'version' = '2'
     AND NEW.proposed_config->'reviewRequired' = 'true'::jsonb
     AND NEW.proposed_config->'approved' = 'false'::jsonb
     AND jsonb_typeof(NEW.proposed_config->'modules') = 'object'
     AND jsonb_typeof(NEW.proposed_config->'tasks') = 'array' THEN
   RETURN NEW;
  END IF;
  NEW.proposed_config := jsonb_strip_nulls(jsonb_build_object(
   'businessName',nullif(NEW.answers->>'businessName',''),
   'businessType',nullif(NEW.answers->>'businessType',''),
   'workTerminology',nullif(NEW.answers->>'workName',''),
   'requestedFeatures',nullif(NEW.answers->>'features',''),
   'requestedStatuses',nullif(NEW.answers->>'statuses',''),
   'rolesAndAccess',nullif(NEW.answers->>'roles',''),
   'dashboardPriorities',nullif(NEW.answers->>'dashboard',''),
   'integrations',nullif(NEW.answers->>'integrations',''),
   'planSelection',NEW.plan_selection,'source','onboarding_submission','reviewRequired',true));
 END IF;
 RETURN NEW;
END;
$function$;
COMMIT;
