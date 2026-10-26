-- Material allocation RPC must record its audit and stock movement events.
GRANT INSERT ON TABLE public.bms_material_allocation_audit,public.bms_material_stock_movements TO service_role;
