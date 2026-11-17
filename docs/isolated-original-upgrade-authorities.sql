-- ISOLATED PROPOSAL. Accessed only through authenticated internal server routes.
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
