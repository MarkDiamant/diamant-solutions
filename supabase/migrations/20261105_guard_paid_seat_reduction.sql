-- Prevent Stripe webhook or administrator seat reductions from silently stranding existing users.
-- Cancellation still disables billing independently; only active paid reductions are guarded.
create or replace function public.bms_guard_paid_seat_reduction()
returns trigger language plpgsql set search_path = public as $$
declare occupied integer;
begin
 if new.plan_code='bms_seats' and new.billing_status in ('active','trialing')
    and coalesce(new.included_users,0)+coalesce(new.extra_users,0) < coalesce(old.included_users,0)+coalesce(old.extra_users,0) then
   select count(*) into occupied from public.business_software_users
   where tenant_id=new.tenant_id and status in ('active','invited','pending');
   if coalesce(new.included_users,0)+coalesce(new.extra_users,0) < occupied then
    raise exception 'Cannot reduce paid seats below % active or invited users; remove users or invitations first',occupied;
   end if;
 end if;
 return new;
end $$;
drop trigger if exists bms_guard_paid_seat_reduction_trigger on public.business_software_subscriptions;
create trigger bms_guard_paid_seat_reduction_trigger before update on public.business_software_subscriptions
for each row execute function public.bms_guard_paid_seat_reduction();
