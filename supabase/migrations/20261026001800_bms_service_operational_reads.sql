-- Server-side BMS uses the service role for tenant-filtered operational reads.
-- Do not grant anonymous or authenticated direct access.
GRANT SELECT ON TABLE public.business_software_stock_balances,public.business_software_sales_orders,public.business_software_sales_order_lines,public.business_software_purchase_order_lines,public.business_software_deliveries,public.business_software_fitting_assignments TO service_role;
