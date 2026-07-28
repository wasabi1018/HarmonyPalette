create table if not exists public.article_daily_views (
  article_id uuid not null references public.articles(id) on delete cascade,
  view_date date not null,
  view_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (article_id, view_date),
  constraint article_daily_views_count_nonnegative check (view_count >= 0)
);

create index if not exists article_daily_views_date_idx
  on public.article_daily_views (view_date desc);

alter table public.article_daily_views enable row level security;

grant all on public.article_daily_views to service_role;

create or replace function public.increment_article_view(article_slug text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_article_id uuid;
  target_date date;
begin
  select id into target_article_id
  from public.articles
  where slug = article_slug
    and status = 'published'
    and deleted_at is null
    and published_at <= now()
  limit 1;

  if target_article_id is null then
    return false;
  end if;

  target_date := timezone('Asia/Tokyo', now())::date;

  insert into public.article_daily_views (
    article_id,
    view_date,
    view_count,
    updated_at
  )
  values (target_article_id, target_date, 1, now())
  on conflict (article_id, view_date)
  do update set
    view_count = public.article_daily_views.view_count + 1,
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.increment_article_view(text) from public;
grant execute on function public.increment_article_view(text) to service_role;
