-- Staging-tested private BMS Storage policy. Apply to live only after production review.
-- Object keys must start with the central tenant UUID followed by a slash.
begin;
insert into storage.buckets (id,name,public,file_size_limit)
values ('bms-job-files','bms-job-files',false,52428800)
on conflict (id) do update set public=false;
drop policy if exists bms_private_member_file_read on storage.objects;
create policy bms_private_member_file_read on storage.objects for select to authenticated
using (
  bucket_id='bms-job-files'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.bms_is_active_member(((storage.foldername(name))[1])::uuid)
);
-- Writes must be performed by separately authorised server-side routes,
-- and every upload path must be derived from the verified tenant session.
commit;
