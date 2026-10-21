-- Additive BMS materials module. Applied to Diamant Solutions on 2026-10-22.
-- Existing Price Book, job, quote, invoice and payment tables remain unchanged.
create table if not exists public.bms_material_orders (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,
 reference text,status text not null default 'draft',created_at timestamptz not null default now());
create table if not exists public.bms_material_lines (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,
 order_id uuid not null references public.bms_material_orders(id),
 product_id uuid,sku text,name text not null,specification text,supplier text,link text,
 unit text not null default 'piece',quantity numeric not null default 1 check(quantity>0),
 cost_net numeric not null default 0 check(cost_net>=0),vat_rate numeric not null default 20 check(vat_rate between 0 and 100),
 status text not null default 'draft',received_qty numeric not null default 0,
 used_qty numeric not null default 0,stock_qty numeric not null default 0,
 waste_qty numeric not null default 0,returned_qty numeric not null default 0,
 created_at timestamptz not null default now());
create table if not exists public.bms_material_supplier_options (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,
 product_id uuid not null,supplier text,sku text,link text,cost_net numeric,
 vat_rate numeric default 20,preferred boolean default false,created_at timestamptz default now());
create table if not exists public.bms_material_stock_movements (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,
 product_id uuid,order_line_id uuid,job_reference text,movement_type text not null,
 quantity_delta numeric not null,unit_cost_net numeric not null default 0,
 note text,created_at timestamptz not null default now());
create table if not exists public.bms_material_allocation_audit (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,
 line_id uuid not null,before_values jsonb not null,after_values jsonb not null,
 created_at timestamptz not null default now());
create table if not exists public.bms_material_receipt_events (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,
 line_id uuid not null,request_id uuid not null,quantity numeric not null check(quantity>0),
 created_at timestamptz not null default now(),unique(tenant_id,line_id,request_id));
alter table public.bms_material_orders enable row level security;
alter table public.bms_material_lines enable row level security;
alter table public.bms_material_supplier_options enable row level security;
alter table public.bms_material_stock_movements enable row level security;
alter table public.bms_material_allocation_audit enable row level security;
alter table public.bms_material_receipt_events enable row level security;
