-- Server-only operational permissions. These tables remain inaccessible directly to anon/authenticated roles.
GRANT SELECT,INSERT,UPDATE ON TABLE
 public.business_software_price_book_items,
 public.business_software_customer_prices,
 public.business_software_stock_locations,
 public.business_software_stock_balances,
 public.business_software_stock_movements,
 public.business_software_stock_reservation_events,
 public.business_software_stock_picking_events,
 public.business_software_sales_orders,
 public.business_software_sales_order_lines,
 public.business_software_purchase_order_lines,
 public.business_software_delivery_lines,
 public.business_software_deliveries,
 public.business_software_fitting_assignments,
 public.business_software_fitter_materials,
 public.business_software_order_request_keys,
 public.bms_material_receipt_events
TO service_role;
