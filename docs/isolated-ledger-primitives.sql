-- ISOLATED PROPOSAL ONLY. Not applied to any connected database.
-- Ledger primitives deliberately do not touch client records or charge Stripe.
BEGIN;
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
COMMIT;
