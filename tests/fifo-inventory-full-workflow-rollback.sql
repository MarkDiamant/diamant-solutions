-- Execute only against a database containing the isolated flooring-showcase-demo fixture.
-- Transaction is rolled back. Never use genuine operational tenants for tests.
begin;
do $$
declare t uuid;l uuid;p uuid;loc uuid;j uuid;a jsonb;b jsonb;v numeric;q1 text:='fifo-fictional-test-20261027-01';q2 text:='fifo-fictional-test-20261027-02';c text:='fifo-fictional-consume-20261027';
begin
select id into t from public.business_software_tenants where slug='flooring-showcase-demo';
select id,product_id into l,p from public.business_software_purchase_order_lines where tenant_id=t and ordered_quantity-received_quantity>=5 and unit_cost_net=24 limit 1;
select id into loc from public.business_software_stock_locations where tenant_id=t limit 1;
select id into j from public.business_software_jobs where tenant_id=t limit 1;
if t is null or l is null or p is null or loc is null or j is null then raise exception 'Fictional fixture missing';end if;
if not public.bms_receive_purchase_line(t,l,loc,3,q1) or not public.bms_receive_purchase_line(t,l,loc,2,q2) then raise exception 'Partial receipts failed';end if;
if public.bms_receive_purchase_line(t,l,loc,3,q1) then raise exception 'Receipt duplicate was not blocked';end if;
select count(*) into v from public.business_software_inventory_cost_layers where tenant_id=t and receipt_movement_id in(select id from public.business_software_stock_movements where tenant_id=t and idempotency_key in ('receipt:'||q1,'receipt:'||q2));
if v<>2 then raise exception 'Expected two receipt layers';end if;
a:=public.bms_consume_job_stock(t,j,p,loc,4,c);
if not (a->>'created')::boolean or (a->>'cost_net')::numeric<>96 then raise exception 'FIFO job cost incorrect: %',a;end if;
b:=public.bms_consume_job_stock(t,j,p,loc,4,c);
if (b->>'created')::boolean then raise exception 'Consumption duplicate was not blocked';end if;
select sum(quantity_remaining) into v from public.business_software_inventory_cost_layers where tenant_id=t and receipt_movement_id in(select id from public.business_software_stock_movements where tenant_id=t and idempotency_key in ('receipt:'||q1,'receipt:'||q2));
if v<>1 then raise exception 'Expected remaining costed quantity 1, got %',v;end if;
end $$;
rollback;
