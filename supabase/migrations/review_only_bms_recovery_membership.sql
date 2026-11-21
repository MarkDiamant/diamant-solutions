-- REVIEW ONLY. Recovery membership does not grant a BMS browser session.
-- Additive name; never replaces guarded bms_login_membership/session helpers.
CREATE FUNCTION public.bms_recovery_membership(p_tenant uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('id',u.id,'email',u.email,'role',u.role,'status',u.status)
 FROM public.business_software_users u
 JOIN public.business_software_tenants t ON t.id=u.tenant_id
 WHERE t.id=p_tenant AND t.status='active'
 AND u.auth_user_id=auth.uid() AND u.status='active'
 AND coalesce(auth.role(),'')='authenticated'
 LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.bms_recovery_membership(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_recovery_membership(uuid) TO authenticated;
