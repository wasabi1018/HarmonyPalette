create or replace function public.get_official_source_storage_usage()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum((metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects
  where bucket_id = 'official-source-documents';
$$;

revoke all on function public.get_official_source_storage_usage() from public, anon, authenticated;
grant execute on function public.get_official_source_storage_usage() to service_role;

alter table public.official_monitor_settings
  alter column max_storage_bytes set default 157286400;

update public.official_monitor_settings
set max_storage_bytes = 157286400
where max_storage_bytes = 262144000;

update storage.buckets
set file_size_limit = 5242880
where id = 'article-images';
