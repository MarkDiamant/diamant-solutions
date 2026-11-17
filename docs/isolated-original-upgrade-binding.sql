CREATE OR REPLACE FUNCTION public.bms_original_upgrade_binding(p_tenant uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; n integer;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
 SELECT count(*) INTO n FROM public.checkout_orders WHERE tenant_id=p_tenant AND service_type='business_software' AND payment_status='paid' AND stripe_subscription_id IS NOT NULL;
 IF n<>1 THEN RAISE EXCEPTION 'Exactly one original paid checkout required'; END IF;
 SELECT c.id,c.tenant_id,c.stripe_subscription_id,c.stripe_customer_id INTO r FROM public.checkout_orders c JOIN public.tenants t ON t.id=c.tenant_id
 WHERE c.tenant_id=p_tenant AND c.service_type='business_software' AND c.payment_status='paid'
 AND c.stripe_subscription_id=t.stripe_subscription_id AND c.stripe_customer_id=t.stripe_customer_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Original tenant binding mismatch'; END IF;
 RETURN jsonb_build_object('tenantId',r.tenant_id,'orderId',r.id,'subscriptionId',r.stripe_subscription_id,'customerId',r.stripe_customer_id);
END $$;
REVOKE ALL ON FUNCTION public.bms_original_upgrade_binding(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_original_upgrade_binding(uuid) TO service_role;
