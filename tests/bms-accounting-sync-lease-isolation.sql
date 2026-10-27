BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE demo uuid; other uuid; first_claim boolean; second_claim boolean; different_provider boolean; invalid_rejected boolean:=false;
BEGIN
 SELECT id INTO demo FROM public.business_software_tenants WHERE slug='flooring-showcase-demo' AND canonical_host='flooring-showcase.invalid';
 IF demo IS NULL THEN RAISE EXCEPTION 'Fictional tenant missing';END IF;
 first_claim:=public.bms_claim_accounting_sync(demo,'xero','test-sync-lease-0001',180);
 second_claim:=public.bms_claim_accounting_sync(demo,'xero','test-sync-lease-0002',180);
 different_provider:=public.bms_claim_accounting_sync(demo,'quickbooks','test-sync-lease-0003',180);
 IF first_claim IS NOT TRUE OR second_claim IS NOT FALSE OR different_provider IS NOT TRUE THEN RAISE EXCEPTION 'Atomic provider cooldown failed';END IF;
 BEGIN PERFORM public.bms_claim_accounting_sync(demo,'unknown','test-sync-lease-0004',180);EXCEPTION WHEN others THEN invalid_rejected:=true;END;
 IF NOT invalid_rejected THEN RAISE EXCEPTION 'Unsupported provider accepted';END IF;
 IF (SELECT count(*) FROM public.business_software_accounting_sync_leases WHERE tenant_id=demo)<>2 THEN RAISE EXCEPTION 'Unexpected lease count';END IF;
END $$;
ROLLBACK;