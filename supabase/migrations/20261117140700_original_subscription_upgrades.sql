-- Existing-subscription first-addition repair. No customer rows changed by migration.
BEGIN;
DO $$ BEGIN
 IF md5(pg_get_functiondef('public.bms_prepare_paid_onboarding_tenant(uuid,uuid)'::regprocedure))<>'765b44378397cec9057f7004b32b63bb' THEN
  RAISE EXCEPTION 'Preparation source changed; review current definition before migration';
 END IF;
END $$;


CREATE TABLE public.bms_original_subscription_upgrades (
 operation_id text PRIMARY KEY,
 original_tenant_id uuid NOT NULL,
 stripe_subscription_id text NOT NULL,
 stripe_customer_id text NOT NULL,
 checkout_order_id uuid NOT NULL,
 quote_hash text NOT NULL,
 quote jsonb NOT NULL,
 consent jsonb NOT NULL,
 target_total_users integer NOT NULL CHECK (target_total_users BETWEEN 2 AND 50),
 immediate_total integer NOT NULL CHECK (immediate_total >= 0),
 recurring_total integer NOT NULL CHECK (recurring_total > 0),
 currency text NOT NULL CHECK (currency='gbp'),
 state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','executing','submitted','pending','paid_applied','failed','expired','reconcile_required')),
 invoice_id text,
 stripe_result jsonb,
 result jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 applied_at timestamptz,
 CHECK(length(quote_hash)=64),
 CHECK(quote ? 'quoteHash' AND quote->>'quoteHash'=quote_hash),
 CHECK(quote ? 'targetTotalUsers' AND (quote->>'targetTotalUsers')::integer=target_total_users)
);
CREATE UNIQUE INDEX bms_original_subscription_one_active_upgrade
 ON public.bms_original_subscription_upgrades(stripe_subscription_id)
 WHERE state IN ('prepared','executing','submitted','pending','reconcile_required');
CREATE UNIQUE INDEX bms_original_subscription_invoice_once
 ON public.bms_original_subscription_upgrades(invoice_id) WHERE invoice_id IS NOT NULL;
ALTER TABLE public.bms_original_subscription_upgrades ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bms_original_subscription_upgrades FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.bms_original_subscription_upgrades TO service_role;
CREATE TABLE public.bms_original_subscription_upgrade_events(
 event_id text PRIMARY KEY,
 operation_id text NOT NULL REFERENCES public.bms_original_subscription_upgrades(operation_id),
 invoice_id text NOT NULL,
 event_type text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bms_original_subscription_upgrade_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bms_original_subscription_upgrade_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.bms_original_subscription_upgrade_events TO service_role;
CREATE TABLE public.bms_original_upgrade_authorities(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 original_tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 stripe_subscription_id text NOT NULL,
 stripe_customer_id text NOT NULL,
 target_total_users integer NOT NULL CHECK(target_total_users BETWEEN 2 AND 50),
 max_immediate_total integer NOT NULL CHECK(max_immediate_total>=0),
 recurring_total integer NOT NULL CHECK(recurring_total>0),
 currency text NOT NULL CHECK(currency='gbp'),
 collection_method text NOT NULL CHECK(collection_method='saved_default_payment_method'),
 tax_policy_ref text NOT NULL CHECK(length(tax_policy_ref)>0),
 owner_authority_ref text NOT NULL CHECK(length(owner_authority_ref)>0),
 client_consent_ref text NOT NULL CHECK(length(client_consent_ref)>0),
 reviewed_evidence_text text NOT NULL CHECK(length(reviewed_evidence_text)>=30),
 reviewed_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 CHECK(expires_at>created_at)
);
ALTER TABLE public.bms_original_upgrade_authorities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bms_original_upgrade_authorities FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.bms_original_upgrade_authorities TO service_role;
CREATE OR REPLACE FUNCTION public.bms_original_upgrade_binding(p_tenant uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; n integer;
BEGIN
 IF coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
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

CREATE OR REPLACE FUNCTION public.bms_original_upgrade_observe(p_id text,p_event text,p_invoice text,p_state text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bms_original_subscription_upgrades;
BEGIN
 IF coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
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
CREATE OR REPLACE FUNCTION public.bms_prepare_paid_onboarding_tenant(p_onboarding_tenant uuid, p_reviewer uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'AS $function$declare o record;c record;existing uuid;new_id uuid;name text;slug text;email text;paid_seats integer;begin if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required';end if; perform pg_advisory_xact_lock(hashtextextended('bms-onboarding:'||p_onboarding_tenant::text,0)); select * into o from public.onboarding where tenant_id=p_onboarding_tenant and service_type='business_software' for update; if not found or o.status not in ('submitted','being_configured') or o.proposed_config->>'version'<>'2' then raise exception 'Submitted BMS onboarding required';end if; select * into c from public.checkout_orders where tenant_id=p_onboarding_tenant and service_type='business_software' and payment_status='paid' and stripe_subscription_id is not null order by paid_at desc limit 1 for update; if not found then raise exception 'Verified paid subscription required';end if; select tenant_id into existing from public.business_software_subscriptions where stripe_subscription_id=c.stripe_subscription_id; if existing is not null then  if not exists(select 1 from public.business_software_onboarding_reviews where tenant_id=p_onboarding_tenant and applied_bms_tenant_id=existing) then raise exception 'Subscription already belongs to a different BMS tenant';end if;  return existing; end if; select greatest(1,coalesce(c.users,1),coalesce(max(target_total_users),1)) into paid_seats from public.bms_original_subscription_upgrades where original_tenant_id=p_onboarding_tenant and stripe_subscription_id=c.stripe_subscription_id and stripe_customer_id=c.stripe_customer_id and checkout_order_id=c.id and state='paid_applied'; if exists(select 1 from public.bms_original_subscription_upgrades where original_tenant_id=p_onboarding_tenant and stripe_subscription_id=c.stripe_subscription_id and state='paid_applied') and not exists(select 1 from public.tenants where id=p_onboarding_tenant and licensed_users=paid_seats and stripe_subscription_id=c.stripe_subscription_id and stripe_customer_id=c.stripe_customer_id) then raise exception 'Paid entitlement sources disagree';end if; name=coalesce(nullif(trim(o.answers->>'businessName'),''),'Business'); slug=left(regexp_replace(lower(name),'[^a-z0-9]+','-','g'),32)||'-'||substr(replace(p_onboarding_tenant::text,'-',''),1,10); email=lower(trim(coalesce(c.customer_email,''))); if email='' then raise exception 'Verified customer email missing';end if; insert into public.business_software_tenants(slug,business_name,canonical_host,status,billing_mode,reference_tenant,data_backend) values(slug,name,slug||'.diamantsolutions.co.uk','suspended','paid',false,'central') returning id into new_id; insert into public.business_software_tenant_settings(tenant_id,business_name,email,timezone,currency,app_config) values(new_id,name,email,'Europe/London','GBP',jsonb_build_object('businessName',name,'systemName','Business Management Software','tenantKey',slug,'logoUrl','/favicon.svg','accentColour','#e66a24','workforceTitle','Team','workforceSingular','team member','workforceRoles',jsonb_build_array('Engineer','Technician','Contractor','Subcontractor','Surveyor','Project manager','Other'),'workTypes',jsonb_build_array('Installation','Repair','Maintenance','Service','Survey','Consultation','Project','Other'),'finishOptions',jsonb_build_array('Standard','Other'),'enquirySources',jsonb_build_array('WhatsApp','Email','Website','Phone','Referral','Existing Customer','Other'),'fileCategories',jsonb_build_array('Site Survey','Before','Drawing','Work','After','Other'),'quoteTemplate','clean','invoiceTemplate','clean','plan',jsonb_build_object('includedUsers',1,'licensedUsers',paid_seats),'ai',jsonb_build_object('enabled',coalesce(c.ai_included,false)),'onboarding',jsonb_build_object('approved',false,'onboardingTenantId',p_onboarding_tenant),'modules','{}'::jsonb)); insert into public.business_software_subscriptions(tenant_id,plan_code,billing_status,billing_interval,included_users,extra_users,ai_enabled,stripe_customer_id,stripe_subscription_id) values(new_id,coalesce(c.plan_key,'business-software'),'active',coalesce(c.billing_interval,'monthly'),paid_seats,0,coalesce(c.ai_included,false),c.stripe_customer_id,c.stripe_subscription_id); insert into public.business_software_users(tenant_id,email,role,status,display_name) values(new_id,email,'owner','invited',nullif(trim(o.answers->>'contactName'),'')); insert into public.business_software_job_sequences(tenant_id,last_number) values(new_id,0); insert into public.business_software_onboarding_reviews(tenant_id,reviewer_id,reviewed_at,applied_bms_tenant_id) values(p_onboarding_tenant,p_reviewer,now(),new_id) on conflict(tenant_id) do update set reviewer_id=excluded.reviewer_id,reviewed_at=excluded.reviewed_at,applied_bms_tenant_id=excluded.applied_bms_tenant_id,updated_at=now(); update public.onboarding set status='being_configured' where tenant_id=p_onboarding_tenant; return new_id;end $function$;
COMMIT;
