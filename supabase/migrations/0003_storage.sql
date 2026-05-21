-- HailGuard — Storage buckets & policies
--
-- Two private buckets hold uploaded compliance documents. Objects are
-- namespaced by the owner's auth uid as the first path segment, e.g.
--   driver-documents/<uid>/id_document.jpg
--   vehicle-documents/<uid>/<vehicle_id>/roadworthy.pdf
-- Drivers may only touch objects under their own uid; admins may read all.

insert into storage.buckets (id, name, public)
values
  ('driver-documents', 'driver-documents', false),
  ('vehicle-documents', 'vehicle-documents', false)
on conflict (id) do nothing;

-- Helper: the uid that owns a given object path (first folder segment).
-- Used in policies below.

-- driver-documents -----------------------------------------------------------
create policy "driver-docs: owner read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "driver-docs: owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "driver-docs: owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "driver-docs: owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- vehicle-documents ----------------------------------------------------------
create policy "vehicle-docs: owner read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vehicle-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vehicle-docs: owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vehicle-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vehicle-docs: owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'vehicle-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vehicle-docs: owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'vehicle-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins may read every compliance document for verification.
create policy "compliance-docs: admin read"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('driver-documents', 'vehicle-documents')
    and public.is_admin()
  );
