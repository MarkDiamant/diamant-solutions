-- A document is evidence, not proof that goods arrived. The UI separately requires
-- the reviewer to confirm the exact purchase line, location and physical count.
CREATE OR REPLACE FUNCTION public.bms_receive_reviewed_document_line(p_tenant uuid,p_member uuid,p_attachment uuid,p_line uuid,p_location uuid,p_quantity numeric,p_expected jsonb)
RETURNS boolean LANGUAGE plpgsql SET search_path TO public AS $$
DECLARE line record; product record; order_status text; snapshot jsonb; receipt record; stable_key text;
BEGIN
 PERFORM 1 FROM business_software_tenants WHERE id=p_tenant AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active tenant required'; END IF;
 PERFORM 1 FROM business_software_users WHERE id=p_member AND tenant_id=p_tenant AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active reviewer required'; END IF;
 PERFORM 1 FROM business_software_ai_attachments WHERE id=p_attachment AND tenant_id=p_tenant AND user_id=p_member FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Owned source document required'; END IF;
 IF p_quantity IS NULL OR p_quantity<=0 OR p_quantity>1000000 OR p_quantity<>round(p_quantity,4) THEN RAISE EXCEPTION 'Explicit physical quantity required'; END IF;
 stable_key:='ruby-receipt-'||p_attachment::text||'-'||p_line::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text||':receipt:'||stable_key,0));
 SELECT * INTO receipt FROM business_software_stock_movements WHERE tenant_id=p_tenant AND idempotency_key='receipt:'||stable_key;
 IF FOUND THEN
  IF receipt.source_type IS DISTINCT FROM 'purchase_order_line' OR receipt.source_id IS DISTINCT FROM p_line::text OR receipt.location_id IS DISTINCT FROM p_location OR receipt.quantity_delta IS DISTINCT FROM p_quantity THEN RAISE EXCEPTION 'This document already recorded a different receipt for that purchase line'; END IF;
  RETURN false;
 END IF;
 SELECT l.* INTO line FROM business_software_purchase_order_lines l WHERE l.id=p_line AND l.tenant_id=p_tenant FOR UPDATE;
 IF NOT FOUND OR line.product_id IS NULL THEN RAISE EXCEPTION 'Purchase line unavailable'; END IF;
 SELECT status INTO order_status FROM business_software_material_orders WHERE id=line.material_order_id AND tenant_id=p_tenant FOR SHARE;
 IF NOT FOUND OR order_status IS NULL OR order_status NOT IN ('ordered','partially_received','received') THEN RAISE EXCEPTION 'An ordered purchase is required'; END IF;
 IF line.unit IS NULL OR trim(line.unit)='' THEN RAISE EXCEPTION 'Verified stock unit required'; END IF;
 SELECT * INTO product FROM business_software_price_book_items WHERE id=line.product_id AND tenant_id=p_tenant AND active=true AND stock_controlled=true AND coalesce(unit,'each')=line.unit AND (coalesce(purchase_unit,'')='' OR purchase_unit=line.unit) FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Product units require review in Purchasing'; END IF;
 PERFORM 1 FROM business_software_stock_locations WHERE id=p_location AND tenant_id=p_tenant AND active=true FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active stock location required'; END IF;
 snapshot:=jsonb_build_object('product_id',line.product_id,'description',line.description,'product_name',product.name,'product_sku',product.sku,'id',line.id,'material_order_id',line.material_order_id,'unit',line.unit,'ordered_quantity',line.ordered_quantity,'received_quantity',line.received_quantity,'unit_cost_net',line.unit_cost_net,'order_status',order_status);
 IF p_expected IS DISTINCT FROM snapshot THEN RAISE EXCEPTION 'Purchase details changed. Reload and review again'; END IF;
 RETURN bms_receive_purchase_line(p_tenant,p_line,p_location,p_quantity,stable_key);
END $$;
REVOKE ALL ON FUNCTION public.bms_receive_reviewed_document_line(uuid,uuid,uuid,uuid,uuid,numeric,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_receive_reviewed_document_line(uuid,uuid,uuid,uuid,uuid,numeric,jsonb) TO service_role;
