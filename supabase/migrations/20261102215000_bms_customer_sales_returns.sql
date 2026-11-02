create table if not exists public.business_software_customer_returns (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 sales_order_line_id uuid not null references public.business_software_sales_order_lines(id),
 product_id uuid not null,
 location_id uuid not null,
 quantity numeric not null check(quantity>0),
 restock boolean not null default false,
 reason text not null,
 credit_amount_net numeric not null check(credit_amount_net>=0),
 financial_status text not null default 'credit_review_required' check(financial_status in ('credit_review_required','no_credit_due','credited')),
 request_key text not null,
 created_at timestamptz not null default now(),
 unique(tenant_id,request_key)
);
create index if not exists bms_customer_returns_line_idx on public.business_software_customer_returns(tenant_id,sales_order_line_id);
alter table public.business_software_customer_returns enable row level security;
revoke all on public.business_software_customer_returns from public,anon,authenticated;
grant select,insert,update,delete on public.business_software_customer_returns to service_role;
create or replace function public.bms_record_customer_return(p_tenant uuid,p_line uuid,p_location uuid,p_qty numeric,p_restock boolean,p_reason text,p_key text)
returns jsonb language plpgsql set search_path to 'public' as $$
declare ln record;v_prev record;v_total numeric;v_id uuid;v_credit numeric;v_restock boolean;
begin
 if p_qty is null or p_qty<=0 or p_qty>100000 or p_qty<>round(p_qty,3) then raise exception 'Invalid return quantity';end if;
 if p_key is null or p_key !~ '^[a-zA-Z0-9:_-]{8,150}$' then raise exception 'Invalid return request key';end if;
 if length(trim(coalesce(p_reason,'')))<3 or length(p_reason)>500 then raise exception 'Return reason required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':customer_return:'||p_key,0));
 select * into v_prev from public.business_software_customer_returns where tenant_id=p_tenant and request_key=p_key;
 if found then
  if v_prev.sales_order_line_id<>p_line or v_prev.location_id<>p_location or v_prev.quantity<>p_qty or v_prev.restock<>p_restock or v_prev.reason<>trim(p_reason) then raise exception 'Return key reused with different details';end if;
  return jsonb_build_object('id',v_prev.id,'created',false,'credit_amount_net',v_prev.credit_amount_net,'financial_status',v_prev.financial_status);
 end if;
 select l.* into ln from public.business_software_sales_order_lines l join public.business_software_sales_orders o on o.id=l.sales_order_id and o.tenant_id=l.tenant_id where l.id=p_line and l.tenant_id=p_tenant for update of l;
 if not found or ln.product_id is null then raise exception 'Sales order line not found';end if;
 if not exists(select 1 from public.business_software_stock_locations where id=p_location and tenant_id=p_tenant) then raise exception 'Stock location not found';end if;
 select coalesce(sum(quantity),0) into v_total from public.business_software_customer_returns where tenant_id=p_tenant and sales_order_line_id=p_line;
 if v_total+p_qty>ln.fulfilled_quantity then raise exception 'Return exceeds delivered quantity';end if;
 v_credit:=round(p_qty*coalesce(ln.agreed_unit_net,0),2);
 insert into public.business_software_customer_returns(tenant_id,sales_order_line_id,product_id,location_id,quantity,restock,reason,credit_amount_net,financial_status,request_key)
 values(p_tenant,p_line,ln.product_id,p_location,p_qty,p_restock,trim(p_reason),v_credit,case when v_credit=0 then 'no_credit_due' else 'credit_review_required' end,p_key) returning id into v_id;
 if p_restock then
  perform public.bms_apply_stock_movement(p_tenant,ln.product_id,p_location,p_qty,'Customer return','customer_return',v_id::text,'customer_return:'||p_key);
 end if;
 return jsonb_build_object('id',v_id,'created',true,'credit_amount_net',v_credit,'financial_status',case when v_credit=0 then 'no_credit_due' else 'credit_review_required' end);
end $$;
revoke all on function public.bms_record_customer_return(uuid,uuid,uuid,numeric,boolean,text,text) from public,anon,authenticated;
grant execute on function public.bms_record_customer_return(uuid,uuid,uuid,numeric,boolean,text,text) to service_role;