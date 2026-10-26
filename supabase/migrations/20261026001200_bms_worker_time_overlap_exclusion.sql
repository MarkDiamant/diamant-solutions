-- Enforce non-overlapping active timesheets atomically for each tenant and worker.
-- Superseded corrections are excluded; btree_gist is already installed.
ALTER TABLE public.business_software_worker_time_entries ADD CONSTRAINT bms_worker_time_prevent_overlapping_active EXCLUDE USING gist (tenant_id WITH =, worker_id WITH =, tstzrange(started_at, ended_at, '[)') WITH &&) WHERE (status IS DISTINCT FROM 'superseded');
