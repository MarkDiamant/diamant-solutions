create unique index if not exists bms_material_order_tenant_id_uq on public.bms_material_orders(tenant_id,id);
create index if not exists bms_material_order_ref_idx on public.bms_material_orders(tenant_id,reference,created_at desc);
create index if not exists bms_material_line_order_idx on public.bms_material_lines(tenant_id,order_id);
create index if not exists bms_material_stock_product_idx on public.bms_material_stock_movements(tenant_id,product_id,created_at desc);
create index if not exists bms_material_supplier_product_idx on public.bms_material_supplier_options(tenant_id,product_id);
alter table public.bms_material_lines add constraint bms_material_line_tenant_order_fk foreign key (tenant_id,order_id) references public.bms_material_orders(tenant_id,id);
