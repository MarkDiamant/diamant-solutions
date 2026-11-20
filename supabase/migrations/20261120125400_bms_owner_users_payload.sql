-- Align read-only user listing with owner/admin application authorization.
-- No seats, subscriptions, memberships or permissions are changed.
CREATE OR REPLACE FUNCTION public.bms_users_payload(p_tenant uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid();out jsonb; limit_seats integer;used_seats integer;active_seats integer; pending_seats integer; billing text;verified boolean;legacy boolean;
begin
 if uid is null or not exists(select 1 from public.business_software_users where tenant_id=p_tenant and auth_user_id=uid and status='active' and (role='owner' or (role='admin' and permissions ? 'manage_users' and permissions ? 'manage_business_settings'))) then raise exception 'not authorised';end if;
 select greatest(0,coalesce(included_users,0)+coalesce(extra_users,0)),billing_status,stripe_subscription_id is not null,plan_code='reference' into limit_seats,billing,verified,legacy from public.business_software_subscriptions where tenant_id=p_tenant;
 select count(*) filter(where status in ('active','invited')),count(*) filter(where status='active'),count(*) filter(where status='invited') into used_seats,active_seats,pending_seats from public.business_software_users where tenant_id=p_tenant;
 select jsonb_build_object('users',coalesce(jsonb_agg(jsonb_build_object('id',id,'name',coalesce(display_name,email),'email',email,'role',role,'status',status,'permissions',permissions,'protectedOwner',role='owner') order by created_at),'[]'::jsonb),'seatCount',used_seats,'seatLimit',case when verified then limit_seats else null end,'activeSeats',active_seats,'pendingSeats',pending_seats,'availableSeats',case when not coalesce(verified,false) then null else greatest(0,limit_seats-used_seats) end,'billingStatus',billing,'legacyWithoutSubscription',coalesce(legacy,false) or not coalesce(verified,false),'pricingConnected',coalesce(verified,false),'hasVerifiedSubscription',coalesce(verified,false),'legacyReference',coalesce(legacy,false)) into out from public.business_software_users where tenant_id=p_tenant;
 return out;
end $function$
;
