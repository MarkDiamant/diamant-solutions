-- ISOLATED PROPOSAL. Not applied to production. Apply ledger primitives first.
-- All callers are trusted server code. Stripe verification remains server-side.
CREATE OR REPLACE FUNCTION public.bms_original_upgrade_begin(p_id text,p_quote jsonb,p_consent jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bms_original_subscription_upgrades;
BEGIN
 IF coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
 IF length(coalesce(p_quote->>'quoteHash',''))<>64 OR length(coalesce(p_consent->>'ownerAuthorityRef',''))<1 OR length(coalesce(p_consent->>'clientConsentRef',''))<1 THEN RAISE EXCEPTION 'Verified authority required'; END IF;
 PERFORM 1 FROM public.bms_original_upgrade_authorities a
 WHERE a.id=(p_consent->>'authorityId')::uuid AND a.revoked_at IS NULL AND a.expires_at>now()
 AND a.original_tenant_id=(p_quote->>'tenantId')::uuid AND a.stripe_subscription_id=p_quote->>'subscriptionId' AND a.stripe_customer_id=p_quote->>'customerId'
 AND a.target_total_users=(p_quote->>'targetTotalUsers')::integer AND a.max_immediate_total>=(p_quote->>'immediateTotal')::integer AND a.recurring_total=(p_quote->>'recurringTotal')::integer
 AND a.tax_policy_ref=p_consent->>'taxPolicyRef' AND a.owner_authority_ref=p_consent->>'ownerAuthorityRef' AND a.client_consent_ref=p_consent->>'clientConsentRef' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Stored authority missing, expired or mismatched'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('bms-upgrade:'||(p_quote->>'subscriptionId'),0));
 SELECT * INTO r FROM public.bms_original_subscription_upgrades WHERE operation_id=p_id FOR UPDATE;
 IF FOUND THEN
  IF r.quote_hash<>p_quote->>'quoteHash' THEN RAISE EXCEPTION 'Existing quote differs; reconcile'; END IF;
  RETURN jsonb_build_object('quoteHash',r.quote_hash,'state',CASE WHEN r.state='paid_applied' THEN 'completed' ELSE 'reconcile_required' END,'result',r.result);
 END IF;
 PERFORM 1 FROM public.checkout_orders c JOIN public.tenants t ON t.id=c.tenant_id
 WHERE c.id=(p_quote->>'orderId')::uuid AND t.id=(p_quote->>'tenantId')::uuid
 AND c.service_type='business_software' AND c.payment_status='paid'
 AND c.stripe_subscription_id=p_quote->>'subscriptionId' AND c.stripe_customer_id=p_quote->>'customerId'
 AND t.stripe_subscription_id=c.stripe_subscription_id AND t.stripe_customer_id=c.stripe_customer_id FOR UPDATE OF c,t;
 IF NOT FOUND THEN RAISE EXCEPTION 'Paid checkout binding mismatch'; END IF;
 INSERT INTO public.bms_original_subscription_upgrades(operation_id,original_tenant_id,stripe_subscription_id,stripe_customer_id,checkout_order_id,quote_hash,quote,consent,target_total_users,immediate_total,recurring_total,currency,state)
 VALUES(p_id,(p_quote->>'tenantId')::uuid,p_quote->>'subscriptionId',p_quote->>'customerId',(p_quote->>'orderId')::uuid,p_quote->>'quoteHash',p_quote,p_consent,(p_quote->>'targetTotalUsers')::integer,(p_quote->>'immediateTotal')::integer,(p_quote->>'recurringTotal')::integer,p_quote->>'currency','executing');
 RETURN jsonb_build_object('quoteHash',p_quote->>'quoteHash','state','new');
END $$;
REVOKE ALL ON FUNCTION public.bms_original_upgrade_begin(text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_original_upgrade_begin(text,jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.bms_original_upgrade_record(p_id text,p_result jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bms_original_subscription_upgrades;
BEGIN
 IF coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
 SELECT * INTO r FROM public.bms_original_subscription_upgrades WHERE operation_id=p_id FOR UPDATE;
 IF NOT FOUND OR r.stripe_subscription_id IS DISTINCT FROM p_result->>'subscriptionId' OR coalesce(p_result->>'invoiceId','') NOT LIKE 'in_%' OR coalesce(p_result->>'state','') NOT IN ('submitted','pending') THEN RAISE EXCEPTION 'Invalid provider result'; END IF;
 IF r.invoice_id IS NOT NULL AND r.invoice_id<>p_result->>'invoiceId' THEN RAISE EXCEPTION 'Invoice already bound'; END IF;
 IF r.state IN ('paid_applied','failed','expired') THEN RETURN false; END IF;
 UPDATE public.bms_original_subscription_upgrades SET invoice_id=p_result->>'invoiceId',state=p_result->>'state',stripe_result=p_result,updated_at=now() WHERE operation_id=p_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.bms_original_upgrade_record(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_original_upgrade_record(text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.bms_original_upgrade_commit(p_id text,p_event text,p_invoice text,p_tenant uuid,p_subscription text,p_total integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bms_original_subscription_upgrades; runtime_id uuid; old_total integer; v_result jsonb;
BEGIN
 IF coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
 -- Same lock as preparation: payment before and after provisioning is one order.
 PERFORM pg_advisory_xact_lock(hashtextextended('bms-onboarding:'||p_tenant::text,0));
 SELECT * INTO r FROM public.bms_original_subscription_upgrades WHERE operation_id=p_id FOR UPDATE;
 IF NOT FOUND OR r.original_tenant_id IS DISTINCT FROM p_tenant OR r.stripe_subscription_id IS DISTINCT FROM p_subscription OR r.invoice_id IS DISTINCT FROM p_invoice OR r.target_total_users IS DISTINCT FROM p_total THEN RAISE EXCEPTION 'Operation binding mismatch'; END IF;
 IF r.state='paid_applied' THEN RETURN r.result; END IF;
 IF r.state NOT IN ('submitted','pending','expired','failed') OR coalesce(p_event,'') NOT LIKE 'evt_%' THEN RAISE EXCEPTION 'Operation is not awaiting verified payment'; END IF;
 IF EXISTS(SELECT 1 FROM public.bms_original_subscription_upgrade_events WHERE event_id=p_event AND operation_id<>p_id) THEN RAISE EXCEPTION 'Event already belongs to an operation'; END IF;
 SELECT t.licensed_users INTO old_total FROM public.tenants t JOIN public.checkout_orders c ON c.tenant_id=t.id
 WHERE t.id=p_tenant AND c.id=r.checkout_order_id AND c.payment_status='paid' AND c.service_type='business_software'
 AND t.stripe_customer_id=r.stripe_customer_id AND t.stripe_subscription_id=p_subscription
 AND c.stripe_customer_id=r.stripe_customer_id AND c.stripe_subscription_id=p_subscription FOR UPDATE OF t,c;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current paid checkout binding mismatch'; END IF;
 SELECT applied_bms_tenant_id INTO runtime_id FROM public.business_software_onboarding_reviews WHERE tenant_id=p_tenant FOR UPDATE;
 IF (SELECT count(*) FROM public.business_software_subscriptions WHERE stripe_subscription_id=p_subscription) > (CASE WHEN runtime_id IS NULL THEN 0 ELSE 1 END) THEN RAISE EXCEPTION 'Ambiguous runtime subscription'; END IF;
 IF runtime_id IS NOT NULL THEN
  PERFORM 1 FROM public.business_software_subscriptions WHERE tenant_id=runtime_id AND stripe_subscription_id=p_subscription AND stripe_customer_id=r.stripe_customer_id AND included_users+extra_users<=p_total FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Runtime binding or entitlement mismatch'; END IF;
  -- Existing original-subscription convention stores total seats in included_users.
  UPDATE public.business_software_subscriptions SET included_users=p_total,extra_users=0,updated_at=now() WHERE tenant_id=runtime_id;
  UPDATE public.business_software_tenant_settings SET app_config=jsonb_set(app_config,'{plan}',coalesce(app_config->'plan','{}'::jsonb)||jsonb_build_object('licensedUsers',p_total)) WHERE tenant_id=runtime_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Runtime settings missing'; END IF;
 END IF;
 UPDATE public.tenants SET licensed_users=p_total WHERE id=p_tenant;
 v_result=jsonb_build_object('state','paid_applied','targetTotalUsers',p_total,'previousLicensedUsers',old_total,'runtimeTenantId',runtime_id,'invoiceId',p_invoice);
 INSERT INTO public.bms_original_subscription_upgrade_events(event_id,operation_id,invoice_id,event_type) VALUES(p_event,p_id,p_invoice,'verified_paid_applied') ON CONFLICT(event_id) DO UPDATE SET event_type='verified_paid_applied' WHERE bms_original_subscription_upgrade_events.operation_id=p_id;
 UPDATE public.bms_original_subscription_upgrades SET state='paid_applied',result=v_result,applied_at=now(),updated_at=now() WHERE operation_id=p_id;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.bms_original_upgrade_commit(text,text,text,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_original_upgrade_commit(text,text,text,uuid,text,integer) TO service_role;
