-- Validate flooring and tile pack quantities on the server when area is supplied.
CREATE OR REPLACE FUNCTION public.bms_create_sales_order(p_tenant uuid, p_customer uuid, p_job uuid, p_lines jsonb, p_reference text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_id uuid;v_line jsonb;v_product uuid;v_qty numeric;v_price numeric;v_name text;v_unit text;v_area numeric;v_waste numeric;v_coverage numeric;begin
 if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 or jsonb_array_length(p_lines)>100 then raise exception 'Provide 1 to 100 lines';end if;
 if not exists(select 1 from business_software_customers where id=p_customer and tenant_id=p_tenant) then raise exception 'Invalid customer';end if;
 if p_job is not null and not exists(select 1 from business_software_jobs where id=p_job and tenant_id=p_tenant) then raise exception 'Invalid job';end if;
 insert into business_software_sales_orders(tenant_id,customer_id,job_id,reference) values(p_tenant,p_customer,p_job,nullif(trim(p_reference),'')) returning id into v_id;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_product:=(v_line->>'product_id')::uuid;v_qty:=(v_line->>'quantity')::numeric;
  if v_qty is null or v_qty<=0 or v_qty>1000000 then raise exception 'Invalid quantity';end if;
  select name,unit,coalesce(nullif(specifications->>'coverage_m2_per_pack','')::numeric,units_per_pack) into v_name,v_unit,v_coverage from business_software_price_book_items where id=v_product and tenant_id=p_tenant and active=true;
  if not found then raise exception 'Product not available';end if;
  if v_line ? 'area_m2' then
    v_area:=(v_line->>'area_m2')::numeric;
    v_waste:=coalesce((v_line->>'wastage_percent')::numeric,10);
    if v_area is null or v_area<=0 or v_area>100000 or v_waste<0 or v_waste>100 or v_coverage is null or v_coverage<=0 then raise exception 'Invalid flooring area, wastage or pack coverage';end if;
    if v_qty<>ceil(v_area*(1+v_waste/100)/v_coverage) then raise exception 'Sales quantity does not match flooring pack calculation';end if;
  end if;
  v_price:=bms_resolve_customer_price(p_tenant,p_customer,v_product);
  insert into business_software_sales_order_lines(tenant_id,sales_order_id,product_id,description,quantity,unit,agreed_unit_net)
  values(p_tenant,v_id,v_product,v_name,v_qty,coalesce(v_unit,'each'),v_price);
 end loop;
 return v_id;
end $function$
;
