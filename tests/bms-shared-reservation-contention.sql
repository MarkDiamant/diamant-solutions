-- Shared reservation contention regression. Transaction rolled back.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE t uuid;p uuid;l uuid;before_reserved numeric;available numeric;failed boolean:=false;
BEGIN
 SELECT b.tenant_id,b.product_id,b.location_id,b.reserved,b.on_hand-b.reserved
 INTO t,p,l,before_reserved,available
 FROM public.business_software_stock_balances b
 JOIN public.business_software_tenants tn ON tn.id=b.tenant_id
 WHERE tn.slug='flooring-showcase-demo' AND tn.canonical_host='flooring-showcase.invalid'
 AND b.on_hand-b.reserved>0
 ORDER BY b.on_hand-b.reserved DESC LIMIT 1;
 IF t IS NULL THEN RAISE EXCEPTION 'No safe fictional demo stock balance with availability';END IF;
 -- Both job and sales-order reservation paths rely on the same atomic balance update.
 PERFORM public.bms_reserve_stock(t,p,l,available);
 BEGIN
  PERFORM public.bms_reserve_stock(t,p,l,0.001);
 EXCEPTION WHEN others THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Over-allocation accepted after stock was fully reserved';END IF;
 IF (SELECT reserved FROM public.business_software_stock_balances WHERE tenant_id=t AND product_id=p AND location_id=l)<>before_reserved+available THEN
 RAISE EXCEPTION 'Failed reservation mutated stock';END IF;
END $$;
ROLLBACK;