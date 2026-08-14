create extension if not exists pgcrypto;
create extension if not exists supabase_vault with schema vault;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

alter table public.import_runs drop constraint if exists import_runs_trigger_type_check;
alter table public.import_runs add constraint import_runs_trigger_type_check
  check (trigger_type in ('manual', 'scheduled', 'cli', 'detected-update'));

alter table public.source_documents add column if not exists byte_size bigint not null default 0;

create table if not exists public.official_monitor_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  scheduled_time time not null default '21:00',
  timezone text not null default 'Asia/Tokyo',
  lookahead_days integer not null default 31 check (lookahead_days between 1 and 31),
  next_run_at timestamptz,
  last_started_at timestamptz,
  last_succeeded_at timestamptz,
  last_error text,
  consecutive_failures integer not null default 0,
  discord_webhook_secret_id uuid,
  discord_webhook_masked text,
  retention_days integer not null default 90 check (retention_days between 7 and 365),
  max_storage_bytes bigint not null default 262144000 check (max_storage_bytes between 10485760 and 524288000),
  updated_at timestamptz not null default now()
);

insert into public.official_monitor_settings (id) values (true)
on conflict (id) do nothing;

create table if not exists public.official_source_states (
  source_key text not null,
  entity_key text not null,
  source_url text not null,
  content_type text not null,
  raw_sha256 text not null,
  normalized_sha256 text not null,
  document_date date,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  last_changed_at timestamptz not null default now(),
  primary key (source_key, entity_key)
);

create table if not exists public.official_source_versions (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  entity_key text not null,
  source_url text not null,
  content_type text not null,
  raw_sha256 text not null,
  normalized_sha256 text not null,
  document_date date,
  storage_path text,
  byte_size bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  unique (source_key, entity_key, raw_sha256)
);

create table if not exists public.official_update_events (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  entity_key text not null,
  event_type text not null check (event_type in ('source-added', 'source-modified', 'source-removed', 'import-ready', 'import-failed', 'news')),
  summary text not null,
  previous_sha256 text,
  current_sha256 text,
  import_run_id uuid references public.import_runs(id) on delete set null,
  review_status text not null default 'pending' check (review_status in ('pending', 'reviewed', 'ignored')),
  diff_counts jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.official_monitor_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.official_update_events(id) on delete cascade,
  job_kind text not null check (job_kind in ('import-date')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded', 'failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  available_at timestamptz not null default now(),
  locked_until timestamptz,
  last_error text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.official_import_diffs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.official_update_events(id) on delete cascade,
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  entity_type text not null check (entity_type in ('schedule', 'operation', 'operating-day')),
  change_type text not null check (change_type in ('added', 'modified', 'removed', 'unchanged', 'uncertain')),
  match_confidence numeric(5,4) not null default 1,
  before_record_id uuid,
  after_record_id uuid,
  before_data jsonb,
  after_data jsonb,
  field_changes jsonb not null default '{}'::jsonb,
  resolution text not null default 'pending' check (resolution in ('pending', 'publish', 'withdraw', 'ignore')),
  created_at timestamptz not null default now()
);

create table if not exists public.official_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.official_update_events(id) on delete cascade,
  channel text not null default 'discord' check (channel = 'discord'),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  provider_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, channel)
);

create index if not exists official_update_events_created_idx on public.official_update_events (created_at desc);
create index if not exists official_monitor_jobs_claim_idx on public.official_monitor_jobs (status, available_at);
create index if not exists official_import_diffs_event_idx on public.official_import_diffs (event_id, change_type);
create index if not exists official_source_versions_retention_idx on public.official_source_versions (detected_at);

drop trigger if exists official_monitor_settings_set_updated_at on public.official_monitor_settings;
create trigger official_monitor_settings_set_updated_at before update on public.official_monitor_settings
for each row execute function public.set_updated_at();

alter table public.official_monitor_settings enable row level security;
alter table public.official_source_states enable row level security;
alter table public.official_source_versions enable row level security;
alter table public.official_update_events enable row level security;
alter table public.official_monitor_jobs enable row level security;
alter table public.official_import_diffs enable row level security;
alter table public.official_notification_deliveries enable row level security;

grant all on public.official_monitor_settings, public.official_source_states,
  public.official_source_versions, public.official_update_events,
  public.official_monitor_jobs, public.official_import_diffs,
  public.official_notification_deliveries to service_role;

create or replace function public.set_official_monitor_discord_webhook(secret_value text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  current_secret_id uuid;
  new_secret_id uuid;
begin
  if secret_value is null or length(trim(secret_value)) = 0 then
    raise exception 'Discord webhook URL is required.';
  end if;
  select discord_webhook_secret_id into current_secret_id
  from public.official_monitor_settings where id = true for update;
  if current_secret_id is null then
    select vault.create_secret(secret_value, 'harmony_palette_discord_webhook', 'Harmony Palette official update monitor')
      into new_secret_id;
  else
    perform vault.update_secret(current_secret_id, secret_value, 'harmony_palette_discord_webhook', 'Harmony Palette official update monitor');
    new_secret_id := current_secret_id;
  end if;
  update public.official_monitor_settings
  set discord_webhook_secret_id = new_secret_id,
      discord_webhook_masked = 'https://discord.com/api/webhooks/***'
  where id = true;
end;
$$;

create or replace function public.get_official_monitor_discord_webhook()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where id = (select discord_webhook_secret_id from public.official_monitor_settings where id = true)
  limit 1;
$$;

revoke all on function public.set_official_monitor_discord_webhook(text) from public, anon, authenticated;
revoke all on function public.get_official_monitor_discord_webhook() from public, anon, authenticated;
grant execute on function public.set_official_monitor_discord_webhook(text) to service_role;
grant execute on function public.get_official_monitor_discord_webhook() to service_role;

create or replace function public.resolve_official_update(target_event uuid, selected_diff_ids uuid[] default '{}')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_run uuid;
begin
  select import_run_id into target_run
  from public.official_update_events
  where id = target_event and review_status = 'pending'
  for update;
  if target_run is null then
    raise exception 'The update event does not exist or is not ready for review.';
  end if;

  update public.schedule_items set publication_status = 'withdrawn', updated_at = now()
  where id in (
    select before_record_id from public.official_import_diffs
    where event_id = target_event and id = any(selected_diff_ids)
      and entity_type = 'schedule' and change_type in ('modified', 'removed')
  );
  update public.attraction_operations set publication_status = 'withdrawn', updated_at = now()
  where id in (
    select before_record_id from public.official_import_diffs
    where event_id = target_event and id = any(selected_diff_ids)
      and entity_type = 'operation' and change_type in ('modified', 'removed')
  );
  update public.park_operating_days set publication_status = 'withdrawn', updated_at = now()
  where id in (
    select before_record_id from public.official_import_diffs
    where event_id = target_event and id = any(selected_diff_ids)
      and entity_type = 'operating-day' and change_type in ('modified', 'removed')
  );

  update public.schedule_items set publication_status = 'published', published_at = now(), updated_at = now()
  where id in (
    select after_record_id from public.official_import_diffs
    where event_id = target_event and id = any(selected_diff_ids)
      and entity_type = 'schedule' and change_type in ('added', 'modified')
  );
  update public.attraction_operations set publication_status = 'published', published_at = now(), updated_at = now()
  where id in (
    select after_record_id from public.official_import_diffs
    where event_id = target_event and id = any(selected_diff_ids)
      and entity_type = 'operation' and change_type in ('added', 'modified')
  );
  update public.park_operating_days set publication_status = 'published', published_at = now(), updated_at = now()
  where id in (
    select after_record_id from public.official_import_diffs
    where event_id = target_event and id = any(selected_diff_ids)
      and entity_type = 'operating-day' and change_type in ('added', 'modified')
  );

  update public.schedule_items set publication_status = 'withdrawn', updated_at = now()
  where import_run_id = target_run and publication_status = 'draft';
  update public.attraction_operations set publication_status = 'withdrawn', updated_at = now()
  where import_run_id = target_run and publication_status = 'draft';
  update public.park_operating_days set publication_status = 'withdrawn', updated_at = now()
  where import_run_id = target_run and publication_status = 'draft';

  update public.official_import_diffs
  set resolution = case when id = any(selected_diff_ids)
    then case when change_type = 'removed' then 'withdraw' else 'publish' end
    else 'ignore' end
  where event_id = target_event;
  update public.import_runs set status = 'published', published_at = now() where id = target_run;
  update public.official_update_events set review_status = 'reviewed', reviewed_at = now() where id = target_event;
end;
$$;

revoke all on function public.resolve_official_update(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.resolve_official_update(uuid, uuid[]) to service_role;
