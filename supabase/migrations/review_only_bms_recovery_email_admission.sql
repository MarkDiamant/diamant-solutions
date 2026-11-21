-- REVIEW ONLY. Do not apply until release/configuration review is closed.
-- A source-only admission ledger, not an auth token store. No raw emails/IPs.
CREATE TABLE public.bms_recovery_email_admissions (
 tenant_id uuid NOT NULL,
 email_hash text NOT NULL,
 reserved_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.bms_recovery_email_admissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bms_recovery_email_admissions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.bms_recovery_email_admissions TO service_role;
CREATE FUNCTION public.bms_reserve_recovery_email(p_tenant uuid,p_host text,p_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE instant timestamptz; identity_hash text; matches integer;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
 IF p_email IS NULL OR length(p_email)>254 OR p_email<>lower(trim(p_email)) OR p_host IS NULL THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.business_software_tenants WHERE id=p_tenant AND status='active' AND canonical_host=p_host) THEN RETURN false; END IF;
 -- Serializes every reservation across deployments and tenants. Sliding windows
 -- avoid boundary bursts. Count even unknown-address admissions to mask eligibility.
 PERFORM pg_advisory_xact_lock(hashtextextended('bms-recovery-email-admission-v1',0));
 instant:=clock_timestamp();
 identity_hash:=encode(sha256(convert_to(p_email,'UTF8')),'hex');
 DELETE FROM public.bms_recovery_email_admissions WHERE reserved_at<=instant-interval '1 hour';
 IF (SELECT count(*) FROM public.bms_recovery_email_admissions)>=20
 OR (SELECT count(*) FROM public.bms_recovery_email_admissions WHERE tenant_id=p_tenant)>=10
 OR EXISTS(SELECT 1 FROM public.bms_recovery_email_admissions WHERE email_hash=identity_hash AND reserved_at>instant-interval '60 seconds') THEN RETURN false; END IF;
 INSERT INTO public.bms_recovery_email_admissions(tenant_id,email_hash,reserved_at) VALUES(p_tenant,identity_hash,instant);
 SELECT count(*) INTO matches FROM public.business_software_users
 WHERE tenant_id=p_tenant AND status='active' AND auth_user_id IS NOT NULL
 AND lower(trim(email))=p_email;
 RETURN matches=1;
END $$;
REVOKE ALL ON FUNCTION public.bms_reserve_recovery_email(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_reserve_recovery_email(uuid,text,text) TO service_role;
