-- Harden shared master BMS tenant-validation trigger search paths. No data modifications.
ALTER FUNCTION public.bms_assert_tenant_links() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_reject_nonstock_inventory() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_snapshot_worker_time_cost() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_ai_attachment_tenant() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_catalog_supplier_tenant() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_labour_reference() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_logistics_tenant() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_material_order_tenant() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_payment_link_tenant() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_related_tenant() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_stock_event_tenant() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_unmatched_receipt_tenant() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_worker_correction() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_worker_relations() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_worker_tenant() SET search_path = public, pg_temp;
ALTER FUNCTION public.bms_validate_worker_update() SET search_path = public, pg_temp;