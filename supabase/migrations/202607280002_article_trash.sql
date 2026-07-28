alter table public.articles
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists articles_deleted_updated_idx
  on public.articles (deleted_at, updated_at desc);

drop policy if exists "published articles are readable" on public.articles;
create policy "published articles are readable" on public.articles
for select to anon, authenticated
using (
  status = 'published'
  and deleted_at is null
  and published_at <= now()
);

drop policy if exists "published article tag relations are readable" on public.article_tags;
create policy "published article tag relations are readable" on public.article_tags
for select to anon, authenticated
using (
  exists (
    select 1
    from public.articles
    where articles.id = article_tags.article_id
      and articles.status = 'published'
      and articles.deleted_at is null
      and articles.published_at <= now()
  )
);
