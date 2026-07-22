create extension if not exists pgcrypto;

create table if not exists public.characters (
  id text primary key,
  slug text not null unique,
  name text not null,
  name_kana text not null default '',
  image_url text not null default '',
  official_url text not null default '',
  is_fan_studio_regular boolean not null default false,
  theme_color text not null default '#ef8099',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  trigger_type text not null check (trigger_type in ('manual', 'scheduled', 'cli')),
  range_start date not null,
  range_end date not null,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'published')),
  schedule_count integer not null default 0,
  operation_count integer not null default 0,
  document_count integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  published_at timestamptz
);

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  source_id text not null,
  source_url text not null,
  document_date date,
  content_type text not null,
  storage_path text,
  sha256 text not null,
  parse_status text not null default 'parsed' check (parse_status in ('parsed', 'needs-review', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (import_run_id, sha256)
);

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references public.import_runs(id) on delete set null,
  source_id text not null,
  external_key text not null,
  source_reference text not null default '',
  source_hash text not null default '',
  kind text not null check (kind in ('greeting', 'event')),
  title text not null,
  event_date date not null,
  end_date date,
  start_time time not null,
  end_time time,
  schedule_type text not null,
  location text not null default '',
  description text not null default '',
  official_url text not null default '',
  verification_status text not null default 'needs-review' check (verification_status in ('verified', 'needs-review', 'parse-failed')),
  confidence numeric(5,4) not null default 0,
  publication_status text not null default 'draft' check (publication_status in ('draft', 'published', 'withdrawn')),
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_run_id, source_id, external_key)
);

create table if not exists public.schedule_characters (
  schedule_id uuid not null references public.schedule_items(id) on delete cascade,
  character_id text references public.characters(id) on delete set null,
  character_name text not null,
  primary key (schedule_id, character_name)
);

create table if not exists public.attraction_operations (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references public.import_runs(id) on delete set null,
  source_id text not null,
  external_key text not null,
  source_reference text not null default '',
  source_hash text not null default '',
  operation_date date not null,
  attraction_name text not null,
  start_time time,
  end_time time,
  operation_status text not null default 'unknown' check (operation_status in ('scheduled', 'suspended', 'limited', 'unknown')),
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
  unique (import_run_id, source_id, external_key)
);

create index if not exists schedule_items_date_status_idx on public.schedule_items (event_date, publication_status, start_time);
create index if not exists schedule_items_run_idx on public.schedule_items (import_run_id);
create unique index if not exists schedule_items_one_published_idx on public.schedule_items (source_id, external_key) where publication_status = 'published';
create index if not exists schedule_characters_character_idx on public.schedule_characters (character_id, schedule_id);
create index if not exists attraction_operations_date_status_idx on public.attraction_operations (operation_date, publication_status, start_time);
create index if not exists attraction_operations_run_idx on public.attraction_operations (import_run_id);
create unique index if not exists attraction_operations_one_published_idx on public.attraction_operations (source_id, external_key) where publication_status = 'published';
create index if not exists source_documents_hash_idx on public.source_documents (sha256);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists schedule_items_set_updated_at on public.schedule_items;
create trigger schedule_items_set_updated_at before update on public.schedule_items
for each row execute function public.set_updated_at();

drop trigger if exists attraction_operations_set_updated_at on public.attraction_operations;
create trigger attraction_operations_set_updated_at before update on public.attraction_operations
for each row execute function public.set_updated_at();

drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at before update on public.characters
for each row execute function public.set_updated_at();

alter table public.characters enable row level security;
alter table public.schedule_items enable row level security;
alter table public.schedule_characters enable row level security;
alter table public.attraction_operations enable row level security;
alter table public.import_runs enable row level security;
alter table public.source_documents enable row level security;

drop policy if exists "public characters are readable" on public.characters;
create policy "public characters are readable" on public.characters for select to anon, authenticated using (true);

drop policy if exists "published schedules are readable" on public.schedule_items;
create policy "published schedules are readable" on public.schedule_items for select to anon, authenticated
using (publication_status = 'published');

drop policy if exists "published schedule characters are readable" on public.schedule_characters;
create policy "published schedule characters are readable" on public.schedule_characters for select to anon, authenticated
using (exists (
  select 1 from public.schedule_items item
  where item.id = schedule_characters.schedule_id and item.publication_status = 'published'
));

drop policy if exists "published operations are readable" on public.attraction_operations;
create policy "published operations are readable" on public.attraction_operations for select to anon, authenticated
using (publication_status = 'published');

grant select on public.characters, public.schedule_items, public.schedule_characters, public.attraction_operations to anon, authenticated;
grant all on public.characters, public.schedule_items, public.schedule_characters, public.attraction_operations, public.import_runs, public.source_documents to service_role;

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

  update public.schedule_items
  set publication_status = 'published', published_at = now(), updated_at = now()
  where import_run_id = target_run and publication_status = 'draft';

  update public.attraction_operations
  set publication_status = 'published', published_at = now(), updated_at = now()
  where import_run_id = target_run and publication_status = 'draft';

  update public.import_runs
  set status = 'published', published_at = now(), finished_at = coalesce(finished_at, now())
  where id = target_run;
end;
$$;

revoke all on function public.publish_import_run(uuid) from public, anon, authenticated;
grant execute on function public.publish_import_run(uuid) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'official-source-documents',
  'official-source-documents',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'application/json', 'text/html']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public.characters (id, slug, name, name_kana, image_url, official_url, is_fan_studio_regular, theme_color)
values
  ('my-melody', 'my-melody', 'マイメロディ', 'まいめろでぃ', '/character-placeholder.svg', 'https://www.harmonyland.jp/', true, '#f7a6bd'),
  ('kuromi', 'kuromi', 'クロミ', 'くろみ', '/character-placeholder.svg', 'https://www.harmonyland.jp/', true, '#b99bd5'),
  ('cinnamoroll', 'cinnamoroll', 'シナモロール', 'しなもろーる', '/character-placeholder.svg', 'https://www.harmonyland.jp/', true, '#9ecde8'),
  ('pompompurin', 'pompompurin', 'ポムポムプリン', 'ぽむぽむぷりん', '/character-placeholder.svg', 'https://www.harmonyland.jp/', true, '#f4cf7b'),
  ('hello-kitty', 'hello-kitty', 'ハローキティ', 'はろーきてぃ', '/character-placeholder.svg', 'https://www.harmonyland.jp/', false, '#ef8099'),
  ('daniel', 'daniel', 'ディアダニエル', 'でぃあだにえる', '/character-placeholder.svg', 'https://www.harmonyland.jp/', false, '#86b7d9')
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  name_kana = excluded.name_kana,
  image_url = excluded.image_url,
  official_url = excluded.official_url,
  is_fan_studio_regular = excluded.is_fan_studio_regular,
  theme_color = excluded.theme_color;
