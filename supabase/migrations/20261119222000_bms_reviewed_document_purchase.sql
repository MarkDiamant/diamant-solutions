-- Shared BMS: explicit document-to-draft review. No stock, billing or supplier messages.
CREATE OR REPLACE FUNCTION public.bms_create_reviewed_document_purchase(p_tenant uuid,p_member uuid,p_attachment uuid,p_supplier uuid,p_lines jsonb)
RETURNS uuid LANGUAGE plpgsql SET search_path TO public AS $$
DECLARE item jsonb; product record; result uuid;
BEGIN
 PERFORM 1 FROM public.business_software_tenants WHERE id=p_tenant AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active tenant required'; END IF;
 PERFORM 1 FROM public.business_software_users WHERE id=p_member AND tenant_id=p_tenant AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active reviewer required'; END IF;
 PERFORM 1 FROM public.business_software_ai_attachments WHERE id=p_attachment AND tenant_id=p_tenant AND user_id=p_member FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Document not owned by reviewer'; END IF;
 PERFORM 1 FROM public.business_software_suppliers WHERE id=p_supplier AND tenant_id=p_tenant AND active=true FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active supplier required'; END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)<1 OR jsonb_array_length(p_lines)>100 THEN RAISE EXCEPTION 'Review 1 to 100 lines'; END IF;
 IF (SELECT count(DISTINCT value->>'product_id') FROM jsonb_array_elements(p_lines))<>jsonb_array_length(p_lines) THEN RAISE EXCEPTION 'Duplicate product'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  IF coalesce(item->>'quantity','')!~'^\d{1,7}(\.\d{1,4})?$' OR coalesce(item->>'unit_cost_net','')!~'^\d{1,7}(\.\d{1,4})?$' THEN RAISE EXCEPTION 'Explicit quantity and net cost required'; END IF;
  IF (item->>'quantity')::numeric<=0 OR (item->>'quantity')::numeric>1000000 OR (item->>'unit_cost_net')::numeric>1000000 THEN RAISE EXCEPTION 'Quantity or cost outside supported bounds'; END IF;
  SELECT unit,purchase_unit INTO product FROM public.business_software_price_book_items WHERE id=(item->>'product_id')::uuid AND tenant_id=p_tenant AND active=true FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active product required'; END IF;
  IF item->>'unit' IS DISTINCT FROM coalesce(product.unit,'each') OR (coalesce(product.purchase_unit,'')<>'' AND product.purchase_unit<>coalesce(product.unit,'each')) THEN RAISE EXCEPTION 'Purchase-unit conversion requires Purchasing'; END IF;
 END LOOP;
 result:=public.bms_create_purchase_order_once(p_tenant,p_supplier,NULL,(SELECT jsonb_agg(jsonb_build_object('product_id',value->>'product_id','quantity',value->>'quantity','unit_cost_net',value->>'unit_cost_net') ORDER BY ord) FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS a(value,ord)),'Draft reviewed from Ruby document '||p_attachment::text,'ruby-purchase-'||p_attachment::text);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.bms_create_reviewed_document_purchase(uuid,uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bms_create_reviewed_document_purchase(uuid,uuid,uuid,uuid,jsonb) TO service_role;
