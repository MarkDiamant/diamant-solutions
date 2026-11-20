-- Assign the final proportional slice its exact remaining quantity.
-- Use the cumulative target less prior restoration so complete returns restore each original allocation exactly.
-- Preserve each original allocation cost and all return authority/stock/credit guards.
CREATE OR REPLACE FUNCTION public.bms_record_customer_return(p_tenant uuid, p_line uuid, p_location uuid, p_qty numeric, p_restock boolean, p_reason text, p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare ln record; prev record; total_returned numeric; prior_restock numeric; id_new uuid; credit numeric; cost_qty numeric; picked_total numeric; movement_id uuid; status_text text; rec record; slice_qty numeric; restored_qty numeric:=0; total_value numeric:=0; return_layer uuid;
begin
 if p_qty is null or p_qty<=0 or p_qty>100000 or p_qty<>round(p_qty,3) then raise exception 'Invalid return quantity'; end if;
 if p_key is null or p_key !~ '^[a-zA-Z0-9:_-]{8,150}$' then raise exception 'Invalid return request key'; end if;
 if length(trim(coalesce(p_reason,'')))<3 or length(p_reason)>500 then raise exception 'Return reason required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':customer_return:'||p_key,0));
 select * into prev from public.business_software_customer_returns where tenant_id=p_tenant and request_key=p_key;
 if found then
  if prev.sales_order_line_id<>p_line or prev.location_id<>p_location or prev.quantity<>p_qty or prev.restock<>p_restock or prev.reason<>trim(p_reason) then raise exception 'Return key reused with different details'; end if;
  return jsonb_build_object('id',prev.id,'created',false,'credit_amount_net',prev.credit_amount_net,'financial_status',prev.financial_status);
 end if;
 select l.* into ln from public.business_software_sales_order_lines l join public.business_software_sales_orders o on o.id=l.sales_order_id and o.tenant_id=l.tenant_id where l.id=p_line and l.tenant_id=p_tenant for update of l;
 if not found or ln.product_id is null then raise exception 'Sales order line not found'; end if;
 if not exists(select 1 from public.business_software_stock_locations where id=p_location and tenant_id=p_tenant and active=true) then raise exception 'Active stock location not found'; end if;
 select coalesce(sum(quantity),0),coalesce(sum(quantity) filter(where restock and financial_status<>'inventory_cost_review_required'),0) into total_returned,prior_restock from public.business_software_customer_returns where tenant_id=p_tenant and sales_order_line_id=p_line;
 if total_returned+p_qty>ln.fulfilled_quantity then raise exception 'Return exceeds delivered quantity'; end if;
 credit:=round(p_qty*coalesce(ln.agreed_unit_net,0),2);
 status_text:=case when credit=0 then 'no_credit_due' else 'credit_review_required' end;
 if p_restock then
  -- Verified allocation evidence must cover all picked goods, and no picked goods may remain undelivered.
  select coalesce(sum(a.quantity),0) into cost_qty
  from public.business_software_inventory_cost_allocations a join public.business_software_stock_movements m on m.id=a.stock_movement_id and m.tenant_id=a.tenant_id
  where a.tenant_id=p_tenant and m.source_type='sales_order_line' and m.source_id=p_line::text and m.product_id=ln.product_id and m.quantity_delta<0;
  select coalesce(-sum(m.quantity_delta),0) into picked_total from public.business_software_stock_movements m
  where m.tenant_id=p_tenant and m.source_type='sales_order_line' and m.source_id=p_line::text and m.product_id=ln.product_id and m.quantity_delta<0;
  if cost_qty<>picked_total or picked_total<>ln.fulfilled_quantity or picked_total<=0
    or exists(select 1 from public.business_software_inventory_cost_allocations a join public.business_software_stock_movements m on m.id=a.stock_movement_id and m.tenant_id=a.tenant_id where a.tenant_id=p_tenant and m.source_type='sales_order_line' and m.source_id=p_line::text and (a.unit_cost_net<0 or a.unit_cost_net is null))
  then status_text:='inventory_cost_review_required'; end if;
 end if;
 insert into public.business_software_customer_returns(tenant_id,sales_order_line_id,product_id,location_id,quantity,restock,reason,credit_amount_net,financial_status,request_key)
 values(p_tenant,p_line,ln.product_id,p_location,p_qty,p_restock,trim(p_reason),credit,status_text,p_key) returning id into id_new;
 if p_restock and status_text<>'inventory_cost_review_required' then
  if not public.bms_apply_stock_movement(p_tenant,ln.product_id,p_location,p_qty,'Customer return verified original cost','customer_return',id_new::text,'customer_return:'||p_key) then raise exception 'Duplicate return stock movement'; end if;
  select id into movement_id from public.business_software_stock_movements where tenant_id=p_tenant and idempotency_key='customer_return:'||p_key and source_id=id_new::text;
  if movement_id is null then raise exception 'Return movement missing'; end if;
  -- Reinstatement across original FIFO allocations is proportional, retaining each exact recorded cost.
  for rec in
   select a.id,a.quantity,a.unit_cost_net,coalesce((select sum(x.quantity) from public.business_software_customer_return_cost_sources x where x.tenant_id=p_tenant and x.original_allocation_id=a.id),0) as restored_before,row_number() over(order by a.id) as allocation_number,count(*) over() as allocation_count from public.business_software_inventory_cost_allocations a
   join public.business_software_stock_movements m on m.id=a.stock_movement_id and m.tenant_id=a.tenant_id
   where a.tenant_id=p_tenant and m.source_type='sales_order_line' and m.source_id=p_line::text and m.product_id=ln.product_id and m.quantity_delta<0
   order by a.id
  loop
   slice_qty:=case when rec.allocation_number=rec.allocation_count then p_qty-restored_qty else least(p_qty-restored_qty,greatest(0,rec.quantity*(prior_restock+p_qty)/cost_qty-rec.restored_before)) end;
   if slice_qty>0 then
    insert into public.business_software_inventory_cost_layers(tenant_id,product_id,location_id,receipt_movement_id,source_type,source_id,quantity_received,quantity_remaining,unit_cost_net)
    values(p_tenant,ln.product_id,p_location,movement_id,'customer_return',id_new::text||':'||rec.id::text,slice_qty,slice_qty,rec.unit_cost_net) returning id into return_layer;
    insert into public.business_software_customer_return_cost_sources(tenant_id,customer_return_id,original_allocation_id,restored_layer_id,quantity,unit_cost_net)
    values(p_tenant,id_new,rec.id,return_layer,slice_qty,rec.unit_cost_net);
    restored_qty:=restored_qty+slice_qty;total_value:=total_value+slice_qty*rec.unit_cost_net;
   end if;
  end loop;
  if restored_qty<>p_qty then raise exception 'Return cost reconciliation failed'; end if;
 end if;
 return jsonb_build_object('id',id_new,'created',true,'credit_amount_net',credit,'financial_status',status_text,'stock_reinstated',p_restock and status_text<>'inventory_cost_review_required','inventory_cost_net',case when p_restock and status_text<>'inventory_cost_review_required' then total_value else null end);
end $function$;
