alter table public.articles
  drop constraint if exists articles_status_check;

alter table public.articles
  add constraint articles_status_check
  check (status in ('draft', 'scheduled', 'published'));

update public.articles
set published_at = coalesce(published_at, created_at)
where status = 'published'
  and published_at is null;

update public.articles
set status = 'scheduled'
where status = 'published'
  and published_at > now();

alter table public.articles
  add column if not exists seo_title text not null default '',
  add column if not exists seo_description text not null default '';

alter table public.articles
  drop constraint if exists articles_seo_title_length,
  drop constraint if exists articles_seo_description_length;

alter table public.articles
  add constraint articles_seo_title_length check (char_length(seo_title) <= 60),
  add constraint articles_seo_description_length check (char_length(seo_description) <= 160);

create table if not exists public.article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  revision_number integer not null,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (article_id, revision_number)
);

create index if not exists article_revisions_article_created_idx
  on public.article_revisions (article_id, revision_number desc);

alter table public.article_revisions enable row level security;

grant all on public.article_revisions to service_role;
