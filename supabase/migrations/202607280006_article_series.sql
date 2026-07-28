create table if not exists public.article_series (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  slug text not null unique,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint article_series_title_length check (char_length(title) between 1 and 100),
  constraint article_series_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  constraint article_series_description_length check (char_length(description) <= 300)
);

alter table public.articles
  add column if not exists series_id uuid references public.article_series(id) on delete set null,
  add column if not exists series_order integer;

alter table public.articles
  drop constraint if exists articles_series_order_range;
alter table public.articles
  add constraint articles_series_order_range
  check (series_order is null or series_order between 1 and 9999);

create index if not exists articles_series_order_idx
  on public.articles (series_id, series_order, published_at)
  where deleted_at is null;

drop trigger if exists article_series_set_updated_at on public.article_series;
create trigger article_series_set_updated_at before update on public.article_series
for each row execute function public.set_updated_at();

alter table public.article_series enable row level security;

drop policy if exists "article series are readable" on public.article_series;
create policy "article series are readable" on public.article_series
for select to anon, authenticated
using (true);

grant select on public.article_series to anon, authenticated;
grant all on public.article_series to service_role;
