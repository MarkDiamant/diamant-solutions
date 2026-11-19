-- Copy supplied contact fields into new inactive drafts; never activate or relink.
BEGIN;
CREATE OR REPLACE FUNCTION public.bms_prepare_draft_onboarding_tenant(p_onboarding_tenant uuid, p_reviewer uuid, p_normalised_config jsonb DEFAULT NULL::jsonb, p_verified_entitlement jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o record;
  c record;
  existing uuid;
  new_id uuid;
  name text;
  slug text;
  email text;
  paid_seats integer;
  upgrade_seats integer;
  legacy boolean;
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Service role required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('bms-onboarding:' || p_onboarding_tenant::text, 0));

  select * into o from public.onboarding
    where tenant_id = p_onboarding_tenant and service_type = 'business_software'
    for update;
  if not found
     or o.status not in ('submitted', 'awaiting_clarification', 'being_configured') then
    raise exception 'BMS onboarding that is ready for draft preparation required';
  end if;

  legacy := o.proposed_config ->> 'version' is distinct from '2';
  if not legacy and p_normalised_config is not null then
    raise exception 'Normalised config is only accepted for legacy submissions';
  end if;
  if legacy then
    -- Normalisation happens only inside this draft workflow and is validated here; the
    -- stored submission keeps its original content for audit.
    if p_normalised_config is null
       or p_normalised_config ->> 'version' is distinct from '2'
       or jsonb_typeof(p_normalised_config -> 'modules') is distinct from 'object'
       or jsonb_typeof(p_normalised_config -> 'completion') is distinct from 'object'
       or jsonb_typeof(p_normalised_config -> 'tasks') is distinct from 'array'
       or jsonb_typeof(p_normalised_config -> 'business') is distinct from 'object' then
      raise exception 'Verified normalised configuration required for legacy submission';
    end if;
  end if;

  -- Never touch an approved setup: approval and activation stay with the existing gated flow.
  if exists(select 1 from public.business_software_onboarding_reviews
            where tenant_id = p_onboarding_tenant and approved_at is not null) then
    raise exception 'Setup is already approved';
  end if;

  select * into c from public.checkout_orders
    where tenant_id = p_onboarding_tenant and service_type = 'business_software'
      and payment_status = 'paid' and stripe_subscription_id is not null
    order by paid_at desc limit 1
    for update;
  if not found then
    raise exception 'Verified paid subscription required';
  end if;

  select tenant_id into existing from public.business_software_subscriptions
    where stripe_subscription_id = c.stripe_subscription_id;
  if existing is not null then
    if not exists(select 1 from public.business_software_onboarding_reviews
                  where tenant_id = p_onboarding_tenant and applied_bms_tenant_id = existing) then
      raise exception 'Subscription already belongs to a different BMS tenant';
    end if;
    return existing; -- idempotent: draft already prepared
  end if;

  -- Seats come only from the server-verified entitlement, bound to this checkout's
  -- subscription and customer. Client-supplied or checkout-recorded seat counts are
  -- never trusted on their own.
  if p_verified_entitlement is null
     or p_verified_entitlement ->> 'subscriptionId' is distinct from c.stripe_subscription_id
     or p_verified_entitlement ->> 'customerId' is distinct from c.stripe_customer_id
     or p_verified_entitlement ->> 'retrievedAt' is null
     or p_verified_entitlement ->> 'seats' is null
     or p_verified_entitlement ->> 'seats' !~ '^[0-9]+$'
     or (p_verified_entitlement ->> 'seats')::int < 1
     or (p_verified_entitlement ->> 'seats')::int > 50 then
    raise exception 'Verified paid entitlement required';
  end if;
  paid_seats := (p_verified_entitlement ->> 'seats')::int;

  select max(target_total_users) into upgrade_seats
    from public.bms_original_subscription_upgrades
    where original_tenant_id = p_onboarding_tenant
      and stripe_subscription_id = c.stripe_subscription_id
      and stripe_customer_id = c.stripe_customer_id
      and checkout_order_id = c.id
      and state = 'paid_applied';
  if upgrade_seats is not null and upgrade_seats is distinct from paid_seats then
    raise exception 'Paid entitlement sources disagree';
  end if;

  name = coalesce(nullif(trim(o.answers ->> 'businessName'), ''), 'Business');
  slug = left(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), 32) || '-' || substr(replace(p_onboarding_tenant::text, '-', ''), 1, 10);
  email = lower(trim(coalesce(c.customer_email, '')));
  if email = '' then
    raise exception 'Verified customer email missing';
  end if;

  -- Draft tenant: suspended status keeps every BMS API read/write closed and no
  -- activation email can send while it is not active. The onboarding record keeps its
  -- current status so the client can still edit and submit outstanding answers.
  insert into public.business_software_tenants(slug, business_name, canonical_host, status, billing_mode, reference_tenant, data_backend)
    values(slug, name, slug || '.diamantsolutions.co.uk', 'suspended', 'paid', false, 'central')
    returning id into new_id;

  insert into public.business_software_tenant_settings(tenant_id, business_name, email, phone, website, timezone, currency, app_config)
    values(new_id, name, email, nullif(trim(o.answers ->> 'phone'), ''), nullif(trim(o.answers ->> 'website'), ''), 'Europe/London', 'GBP', jsonb_build_object(
      'businessName', name,
      'businessDetails', jsonb_build_object('phone', coalesce(nullif(trim(o.answers ->> 'phone'), ''), ''), 'website', coalesce(nullif(trim(o.answers ->> 'website'), ''), ''), 'email', email),
      'systemName', 'Business Management Software',
      'tenantKey', slug,
      'logoUrl', '/favicon.svg',
      'accentColour', '#e66a24',
      'workforceTitle', 'Team',
      'workforceSingular', 'team member',
      'workforceRoles', jsonb_build_array('Engineer', 'Technician', 'Contractor', 'Subcontractor', 'Surveyor', 'Project manager', 'Other'),
      'workTypes', jsonb_build_array('Installation', 'Repair', 'Maintenance', 'Service', 'Survey', 'Consultation', 'Project', 'Other'),
      'finishOptions', jsonb_build_array('Standard', 'Other'),
      'invoiceTemplate', 'clean',
      'plan', jsonb_build_object('includedUsers', 1, 'licensedUsers', paid_seats),
      'ai', jsonb_build_object('enabled', coalesce(c.ai_included, false)),
      'onboarding', jsonb_build_object('approved', false, 'onboardingTenantId', p_onboarding_tenant, 'draft', true),
      'modules', '{}'::jsonb));

  insert into public.business_software_subscriptions(tenant_id, plan_code, billing_status, billing_interval, included_users, extra_users, ai_enabled, stripe_customer_id, stripe_subscription_id)
    values(new_id, coalesce(c.plan_key, 'business-software'), 'active', coalesce(c.billing_interval, 'monthly'), paid_seats, 0, coalesce(c.ai_included, false), c.stripe_customer_id, c.stripe_subscription_id);

  insert into public.business_software_users(tenant_id, email, role, status, display_name)
    values(new_id, email, 'owner', 'invited', nullif(trim(o.answers ->> 'contactName'), ''));

  insert into public.business_software_job_sequences(tenant_id, last_number) values(new_id, 0);

  insert into public.business_software_onboarding_reviews(tenant_id, reviewer_id, reviewed_at, applied_bms_tenant_id, draft_provenance)
    values(p_onboarding_tenant, p_reviewer, now(), new_id, jsonb_build_object(
      'configSource', case when legacy then 'legacy_v1_normalised_at_draft' else 'submitted_v2' end,
      'originalProposedConfigVersion', o.proposed_config ->> 'version',
      'normalisedConfig', case when legacy then p_normalised_config else null end,
      'normalisedBy', p_reviewer,
      'normalisedAt', now(),
      'verifiedEntitlement', p_verified_entitlement,
      'checkoutUsers', c.users,
      'seatDiscrepancy', (c.users is not null and c.users is distinct from paid_seats)))
    on conflict(tenant_id) do update
      set reviewer_id = excluded.reviewer_id,
          reviewed_at = excluded.reviewed_at,
          applied_bms_tenant_id = excluded.applied_bms_tenant_id,
          draft_provenance = excluded.draft_provenance,
          updated_at = now();

  return new_id;
end
$function$
;
REVOKE ALL ON FUNCTION public.bms_prepare_draft_onboarding_tenant(uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bms_prepare_draft_onboarding_tenant(uuid, uuid, jsonb, jsonb) TO service_role;
COMMIT;
