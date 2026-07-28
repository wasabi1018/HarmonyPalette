create extension if not exists pg_trgm;

create index if not exists articles_title_trgm_idx
  on public.articles using gin (title gin_trgm_ops);
create index if not exists articles_excerpt_trgm_idx
  on public.articles using gin (excerpt gin_trgm_ops);
create index if not exists articles_content_html_trgm_idx
  on public.articles using gin (content_html gin_trgm_ops);

create or replace function public.search_published_articles(
  search_query text default '',
  filter_tag_slug text default '',
  result_limit integer default 9,
  result_offset integer default 0
)
returns table (
  article_id uuid,
  relevance integer,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with matches as (
    select
      articles.id,
      articles.published_at,
      case
        when nullif(trim(search_query), '') is null then 0
        else
          case when lower(articles.title) = lower(trim(search_query)) then 100 else 0 end
          + case when articles.title ilike '%' || trim(search_query) || '%' then 40 else 0 end
          + case when articles.excerpt ilike '%' || trim(search_query) || '%' then 15 else 0 end
          + case when articles.content_html ilike '%' || trim(search_query) || '%' then 5 else 0 end
      end as relevance
    from public.articles
    where articles.status = 'published'
      and articles.deleted_at is null
      and articles.published_at <= now()
      and (
        nullif(trim(search_query), '') is null
        or articles.title ilike '%' || trim(search_query) || '%'
        or articles.excerpt ilike '%' || trim(search_query) || '%'
        or articles.content_html ilike '%' || trim(search_query) || '%'
      )
      and (
        nullif(trim(filter_tag_slug), '') is null
        or exists (
          select 1
          from public.article_tags
          join public.tags on tags.id = article_tags.tag_id
          where article_tags.article_id = articles.id
            and tags.slug = trim(filter_tag_slug)
        )
      )
  )
  select
    matches.id,
    matches.relevance,
    count(*) over () as total_count
  from matches
  order by matches.relevance desc, matches.published_at desc
  limit least(greatest(result_limit, 1), 50)
  offset greatest(result_offset, 0);
$$;

revoke all on function public.search_published_articles(text, text, integer, integer) from public;
grant execute on function public.search_published_articles(text, text, integer, integer)
  to anon, authenticated, service_role;
