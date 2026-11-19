-- Preserve imported purchase-cost precision and reject unresolved import semantics.
-- This migration imports no products and changes no tenant or account status.
DROP TRIGGER bms_price_history_on_item ON public.business_software_price_book_items;
ALTER TABLE public.business_software_price_book_items ALTER COLUMN cost_net TYPE numeric(18,8);
CREATE TRIGGER bms_price_history_on_item AFTER INSERT OR UPDATE OF cost_net, supplier_id ON public.business_software_price_book_items FOR EACH ROW EXECUTE FUNCTION public.bms_record_supplier_price_change();
CREATE OR REPLACE FUNCTION public.bms_import_products(p_tenant uuid,p_rows jsonb,p_preview boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE
 r jsonb; n text; sku_value text; stock_unit text; buy_unit text; category_value text;
 cost_value numeric; price_value numeric; vat_value numeric; coverage_value numeric;
 cost_text text; price_text text; vat_text text; coverage_text text; row_issues text[];
 errors jsonb:='[]'::jsonb; valid_count integer:=0; idx integer:=0;
 seen_skus text[]:=ARRAY[]::text[]; seen_names text[]:=ARRAY[]::text[]; normalized jsonb:='[]'::jsonb;
 item jsonb; specs jsonb; unknown_keys text[];
 allowed_keys constant text[]:=ARRAY['name','sku','category','unit','purchase_unit','cost_net','sell_net','stock_controlled','cost_vat_rate','price_basis','description','coverage_m2_per_pack','supplier_id','source_file','source_row'];
BEGIN
 IF p_preview IS NULL THEN RAISE EXCEPTION 'Explicit preview mode required';END IF;
 IF p_tenant IS NULL OR NOT EXISTS(SELECT 1 FROM business_software_tenants WHERE id=p_tenant) THEN RAISE EXCEPTION 'Valid tenant required';END IF;
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows)<1 OR jsonb_array_length(p_rows)>500 THEN RAISE EXCEPTION 'Import must contain 1 to 500 products';END IF;
 IF NOT p_preview THEN
  IF NOT EXISTS(SELECT 1 FROM business_software_tenants WHERE id=p_tenant AND status='active') THEN RAISE EXCEPTION 'Product import requires an active tenant';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('bms_product_import:'||p_tenant::text,0));
 END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  idx:=idx+1;row_issues:=ARRAY[]::text[];
  IF jsonb_typeof(r) IS DISTINCT FROM 'object' THEN
   errors:=errors||jsonb_build_array(jsonb_build_object('row',idx,'issue','Product row must be an object'));CONTINUE;
  END IF;
  SELECT array_agg(k) INTO unknown_keys FROM jsonb_object_keys(r) AS k WHERE NOT(k=ANY(allowed_keys));
  IF cardinality(unknown_keys)>0 THEN row_issues:=array_append(row_issues,'Unsupported fields: '||array_to_string(unknown_keys,', ')||'. They have not been imported or discarded.');END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(r) e WHERE e.key=ANY(ARRAY['name','sku','category','unit','purchase_unit','price_basis','description','supplier_id','source_file']) AND jsonb_typeof(e.value) NOT IN ('string','null')) THEN row_issues:=array_append(row_issues,'Text fields must contain text, not objects, numbers or booleans');END IF;
  n:=nullif(trim(r->>'name'),'');sku_value:=nullif(trim(r->>'sku'),'');category_value:=nullif(trim(r->>'category'),'');stock_unit:=nullif(trim(r->>'unit'),'');buy_unit:=nullif(trim(r->>'purchase_unit'),'');
  IF n IS NULL OR length(n)>200 THEN row_issues:=array_append(row_issues,'Name is required and must be at most 200 characters');END IF;
  IF sku_value IS NOT NULL AND length(sku_value)>100 THEN row_issues:=array_append(row_issues,'SKU must be at most 100 characters');END IF;
  IF category_value IS NULL OR length(category_value)>100 THEN row_issues:=array_append(row_issues,'Choose an explicit category');END IF;
  IF stock_unit IS NULL OR length(stock_unit)>80 THEN row_issues:=array_append(row_issues,'Choose the saved selling/stock unit; no each default is applied');END IF;
  IF jsonb_typeof(r->'stock_controlled') IS DISTINCT FROM 'boolean' THEN row_issues:=array_append(row_issues,'Confirm stock_controlled as true or false');END IF;
  IF r->>'price_basis' IS DISTINCT FROM 'net' THEN row_issues:=array_append(row_issues,'Confirm price_basis as net; gross or unknown prices are not converted');END IF;
  cost_text:=nullif(trim(r->>'cost_net'),'');price_text:=nullif(trim(r->>'sell_net'),'');vat_text:=nullif(trim(r->>'cost_vat_rate'),'');coverage_text:=nullif(trim(r->>'coverage_m2_per_pack'),'');
  cost_value:=NULL;price_value:=NULL;vat_value:=NULL;coverage_value:=NULL;
  IF cost_text IS NOT NULL THEN
   IF cost_text!~'^[0-9]{1,10}(\.[0-9]{1,8})?$' THEN row_issues:=array_append(row_issues,'Cost must be a non-negative net value with at most 10 integer and 8 decimal digits; no rounding is applied');ELSE cost_value:=cost_text::numeric;END IF;
   IF buy_unit IS NULL OR length(buy_unit)>80 THEN row_issues:=array_append(row_issues,'Confirm the purchase-cost unit independently of the selling-price unit');
   END IF;
  END IF;
  IF buy_unit IS NOT NULL AND buy_unit IS DISTINCT FROM stock_unit THEN row_issues:=array_append(row_issues,'Different purchase and stock units require a reviewed conversion workflow; this importer does not guess a factor');END IF;
  IF vat_text IS NULL OR vat_text!~'^[0-9]{1,3}(\.[0-9]{1,2})?$' THEN row_issues:=array_append(row_issues,'Confirm the purchase VAT rate; no VAT default is applied');ELSE vat_value:=vat_text::numeric;IF vat_value>100 THEN row_issues:=array_append(row_issues,'Purchase VAT rate must be between 0 and 100');END IF;END IF;
  IF price_text IS NULL OR price_text!~'^[0-9]{1,10}(\.[0-9]{1,2})?$' THEN row_issues:=array_append(row_issues,'An explicit non-negative net selling price with at most 2 decimal digits is required; no price is invented');ELSE price_value:=price_text::numeric;END IF;
  IF coverage_text IS NOT NULL THEN
   IF coverage_text!~'^[0-9]{1,6}(\.[0-9]{1,8})?$' THEN row_issues:=array_append(row_issues,'Coverage must be an explicit positive square-metre value');ELSE coverage_value:=coverage_text::numeric;IF coverage_value<=0 OR coverage_value>100000 THEN row_issues:=array_append(row_issues,'Coverage must be greater than zero and at most 100000 square metres');END IF;END IF;
   IF stock_unit NOT IN ('pack','box') THEN row_issues:=array_append(row_issues,'Square-metre pack coverage requires an explicit pack or box saved unit');END IF;
  END IF;
  IF nullif(trim(r->>'supplier_id'),'') IS NOT NULL THEN
   IF r->>'supplier_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN row_issues:=array_append(row_issues,'Invalid supplier identifier');
   ELSIF NOT EXISTS(SELECT 1 FROM business_software_suppliers WHERE tenant_id=p_tenant AND id=(r->>'supplier_id')::uuid) THEN row_issues:=array_append(row_issues,'Supplier is not in this tenant');END IF;
  END IF;
  IF length(coalesce(r->>'description',''))>2000 THEN row_issues:=array_append(row_issues,'Description exceeds 2000 characters and has not been truncated');END IF;
  IF length(coalesce(r->>'source_file',''))>300 THEN row_issues:=array_append(row_issues,'Source filename exceeds 300 characters');END IF;
  IF nullif(r->>'source_row','') IS NOT NULL AND r->>'source_row'!~'^[0-9]{1,9}$' THEN row_issues:=array_append(row_issues,'Source row must be a positive whole number');END IF;
  IF sku_value IS NOT NULL AND (lower(sku_value)=ANY(seen_skus) OR EXISTS(SELECT 1 FROM business_software_price_book_items WHERE tenant_id=p_tenant AND lower(trim(sku))=lower(sku_value))) THEN row_issues:=array_append(row_issues,'Duplicate SKU');END IF;
  IF sku_value IS NULL AND n IS NOT NULL AND (lower(n)=ANY(seen_names) OR EXISTS(SELECT 1 FROM business_software_price_book_items WHERE tenant_id=p_tenant AND lower(trim(name))=lower(n))) THEN row_issues:=array_append(row_issues,'Product name already exists without an identifying SKU; review rather than duplicate');END IF;
  IF sku_value IS NOT NULL THEN seen_skus:=array_append(seen_skus,lower(sku_value));ELSIF n IS NOT NULL THEN seen_names:=array_append(seen_names,lower(n));END IF;
  IF cardinality(row_issues)>0 THEN
   errors:=errors||jsonb_build_array(jsonb_build_object('row',idx,'name',n,'issue',array_to_string(row_issues,'; ')));
  ELSE
   specs:='{}'::jsonb;
   IF coverage_value IS NOT NULL THEN specs:=specs||jsonb_build_object('coverage_m2_per_pack',coverage_value);END IF;
   IF nullif(trim(r->>'source_file'),'') IS NOT NULL THEN specs:=specs||jsonb_build_object('import_source_file',trim(r->>'source_file'));END IF;
   IF nullif(r->>'source_row','') IS NOT NULL THEN specs:=specs||jsonb_build_object('import_source_row',(r->>'source_row')::integer);END IF;
   normalized:=normalized||jsonb_build_array(jsonb_build_object('name',n,'sku',sku_value,'category',category_value,'unit',stock_unit,'purchase_unit',buy_unit,'cost_net',cost_value,'sell_net',price_value,'cost_vat_rate',vat_value,'stock_controlled',(r->>'stock_controlled')::boolean,'description',nullif(r->>'description',''),'supplier_id',nullif(trim(r->>'supplier_id'),''),'specifications',specs));
   valid_count:=valid_count+1;
  END IF;
 END LOOP;
 IF NOT p_preview AND jsonb_array_length(errors)>0 THEN RAISE EXCEPTION 'Import has unresolved fields; review the preview. Nothing imported';END IF;
 IF NOT p_preview THEN
  FOR item IN SELECT value FROM jsonb_array_elements(normalized) LOOP
   INSERT INTO business_software_price_book_items(tenant_id,name,sku,category,unit,purchase_unit,selling_unit,cost_net,pricing_method,fixed_sell_net,cost_vat_rate,cost_includes_vat,stock_controlled,description,supplier_id,specifications)
   VALUES(p_tenant,item->>'name',item->>'sku',item->>'category',item->>'unit',item->>'purchase_unit',item->>'unit',(item->>'cost_net')::numeric,'fixed',(item->>'sell_net')::numeric,(item->>'cost_vat_rate')::numeric,false,(item->>'stock_controlled')::boolean,item->>'description',(item->>'supplier_id')::uuid,item->'specifications');
  END LOOP;
 END IF;
 RETURN jsonb_build_object('preview',p_preview,'valid_count',valid_count,'issue_count',jsonb_array_length(errors),'issues',errors,'normalized_rows',normalized,'imported',CASE WHEN p_preview THEN 0 ELSE valid_count END);
END $function$;
