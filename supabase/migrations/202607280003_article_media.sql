create table if not exists public.article_media (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  alt_text text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint article_media_file_name_length check (char_length(file_name) between 1 and 255),
  constraint article_media_alt_text_length check (char_length(alt_text) <= 300),
  constraint article_media_size_positive check (size_bytes > 0),
  constraint article_media_mime_type check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
  )
);

create index if not exists article_media_created_idx
  on public.article_media (created_at desc);

drop trigger if exists article_media_set_updated_at on public.article_media;
create trigger article_media_set_updated_at before update on public.article_media
for each row execute function public.set_updated_at();

alter table public.article_media enable row level security;

grant all on public.article_media to service_role;
