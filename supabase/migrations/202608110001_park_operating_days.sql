alter table public.import_runs
  add column if not exists operating_day_count integer not null default 0;

create table if not exists public.park_operating_days (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references public.import_runs(id) on delete set null,
  source_id text not null,
  external_key text not null,
  source_reference text not null default '',
  source_hash text not null default '',
  operation_date date not null,
  operating_status text not null default 'unknown' check (operating_status in ('open', 'closed', 'unknown')),
  opening_time time,
  closing_time time,
  source_title text not null default '',
  notes text not null default '',
  official_url text not null default '',
  verification_status text not null default 'needs-review' check (verification_status in ('verified', 'needs-review', 'parse-failed')),
  confidence numeric(5,4) not null default 0,
  publication_status text not null default 'draft' check (publication_status in ('draft', 'published', 'withdrawn')),
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_run_id, source_id, external_key),
  check (
    (operating_status = 'open' and opening_time is not null and closing_time is not null and opening_time < closing_time)
    or (operating_status in ('closed', 'unknown') and opening_time is null and closing_time is null)
  )
);

create index if not exists park_operating_days_date_status_idx
  on public.park_operating_days (operation_date, publication_status);
create index if not exists park_operating_days_run_idx
  on public.park_operating_days (import_run_id);
create unique index if not exists park_operating_days_one_published_idx
  on public.park_operating_days (source_id, external_key)
  where publication_status = 'published';

drop trigger if exists park_operating_days_set_updated_at on public.park_operating_days;
create trigger park_operating_days_set_updated_at before update on public.park_operating_days
for each row execute function public.set_updated_at();

alter table public.park_operating_days enable row level security;

drop policy if exists "published park operating days are readable" on public.park_operating_days;
create policy "published park operating days are readable" on public.park_operating_days
for select to anon, authenticated using (publication_status = 'published');

grant select on public.park_operating_days to anon, authenticated;
grant all on public.park_operating_days to service_role;

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
        and new_item.verification_status = 'verified'
        and new_item.operating_status in ('open', 'closed')
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
