-- Tenant-owned purchase document index and immutable supplier price observations.
create table if not exists public.business_software_purchase_documents (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 material_order_id uuid not null,
 supplier_id uuid,
 document_kind text not null check(document_kind in ('quotation','invoice','delivery_note','other')),
 file_name text not null,
 mime_type text,
 storage_path text not null unique,
 uploaded_by text,
 created_at timestamptz not null default now(),
 foreign key (material_order_id) references public.business_software_material_orders(id)
);
create index if not exists bms_purchase_documents_order_idx on public.business_software_purchase_documents(tenant_id,material_order_id,created_at desc);
alter table public.business_software_purchase_documents enable row level security;
revoke all on public.business_software_purchase_documents from anon,authenticated;
grant select,insert on public.business_software_purchase_documents to service_role;
create table if not exists public.business_software_supplier_price_history (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 supplier_id uuid not null,
 product_id uuid not null,
 unit_cost_net numeric not null check(unit_cost_net>=0),
 purchase_unit text,
 source_document_id uuid references public.business_software_purchase_documents(id),
 observed_at timestamptz not null default now(),
 recorded_by text,
 notes text
);
create index if not exists bms_supplier_price_history_idx on public.business_software_supplier_price_history(tenant_id,product_id,supplier_id,observed_at desc);
alter table public.business_software_supplier_price_history enable row level security;
revoke all on public.business_software_supplier_price_history from anon,authenticated;
grant select,insert on public.business_software_supplier_price_history to service_role;
