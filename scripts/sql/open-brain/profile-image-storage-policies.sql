-- Storage RLS policies for profile image uploads scoped to each authenticated user.
-- Bucket: profileImage

create policy "profileImage_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profileImage'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profileImage_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profileImage'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profileImage'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profileImage_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profileImage'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow any client (including unauthenticated web image requests) to read
-- profile images from this bucket via /storage/v1/object/public/...
create policy "profileImage_select_public_read"
on storage.objects
for select
to public
using (
  bucket_id = 'profileImage'
);

-- Keep authenticated private reads scoped to the caller's own folder.
create policy "profileImage_select_own_folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profileImage'
  and (storage.foldername(name))[1] = auth.uid()::text
);
