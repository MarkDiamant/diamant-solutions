-- Shared BMS: prevent duplicate active worker timesheets and duplicate billing from retries.
CREATE UNIQUE INDEX IF NOT EXISTS bms_worker_time_no_duplicate_active_interval ON public.business_software_worker_time_entries(tenant_id,worker_id,job_id,work_type,started_at,ended_at) WHERE status IS DISTINCT FROM 'superseded';
