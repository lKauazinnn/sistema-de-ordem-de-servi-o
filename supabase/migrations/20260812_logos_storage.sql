-- Bucket publico para logos das assistencias, usado no cabecalho do PDF da OS.
-- Cada usuario so pode escrever dentro da propria pasta ({user_id}/...).
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "logos_public_read" on storage.objects;
create policy "logos_public_read"
on storage.objects for select
using (bucket_id = 'logos');

drop policy if exists "logos_owner_insert" on storage.objects;
create policy "logos_owner_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "logos_owner_update" on storage.objects;
create policy "logos_owner_update"
on storage.objects for update
to authenticated
using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "logos_owner_delete" on storage.objects;
create policy "logos_owner_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
