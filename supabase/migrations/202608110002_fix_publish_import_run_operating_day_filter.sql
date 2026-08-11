create or replace function public.publish_import_run(target_run uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.import_runs
    where id = target_run and status = 'succeeded'
  ) then
    raise exception 'The import run does not exist or is not ready to publish.';
  end if;

  update public.schedule_items old_item
  set publication_status = 'withdrawn', updated_at = now()
  where old_item.publication_status = 'published'
    and old_item.import_run_id is distinct from target_run
    and exists (
      select 1 from public.schedule_items new_item
      where new_item.import_run_id = target_run
        and new_item.publication_status = 'draft'
        and new_item.source_id = old_item.source_id
        and new_item.external_key = old_item.external_key
    );

  update public.attraction_operations old_item
  set publication_status = 'withdrawn', updated_at = now()
  where old_item.publication_status = 'published'
    and old_item.import_run_id is distinct from target_run
    and exists (
      select 1 from public.attraction_operations new_item
      where new_item.import_run_id = target_run
        and new_item.publication_status = 'draft'
        and new_item.source_id = old_item.source_id
        and new_item.external_key = old_item.external_key
    );

  update public.park_operating_days old_item
  set publication_status = 'withdrawn', updated_at = now()
  where old_item.publication_status = 'published'
    and old_item.import_run_id is distinct from target_run
    and exists (
      select 1 from public.park_operating_days new_item
      where new_item.import_run_id = target_run
        and new_item.publication_status = 'draft'
        and new_item.verification_status = 'verified'
        and new_item.operating_status in ('open', 'closed')
        and new_item.source_id = old_item.source_id
        and new_item.external_key = old_item.external_key
    );

  update public.schedule_items
  set publication_status = 'published', published_at = now(), updated_at = now()
  where import_run_id = target_run and publication_status = 'draft';

  update public.attraction_operations
  set publication_status = 'published', published_at = now(), updated_at = now()
  where import_run_id = target_run and publication_status = 'draft';

  update public.park_operating_days
  set publication_status = 'published', published_at = now(), updated_at = now()
  where import_run_id = target_run
    and publication_status = 'draft'
    and verification_status = 'verified'
    and operating_status in ('open', 'closed');

  update public.import_runs
  set status = 'published', published_at = now(), finished_at = coalesce(finished_at, now())
  where id = target_run;
end;
$$;

revoke all on function public.publish_import_run(uuid) from public, anon, authenticated;
grant execute on function public.publish_import_run(uuid) to service_role;
