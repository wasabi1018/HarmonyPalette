-- Event-specific guides share the existing article editor and lifecycle.
create table public.guide_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  display_order integer not null default 0 check (display_order between 0 and 100000)
);
create table public.guide_settings (
  id boolean primary key default true check (id),
  preparing boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.guide_settings (id, preparing) values (true, true);
alter table public.articles
  add column is_strategy_guide boolean not null default false,
  add column guide_event_key text check (guide_event_key is null or length(trim(guide_event_key)) between 1 and 500),
  add column guide_category_id uuid references public.guide_categories(id) on delete set null,
  add column guide_display_order integer not null default 0 check (guide_display_order between 0 and 100000),
  add constraint articles_guide_assignment_check check (is_strategy_guide or (guide_event_key is null and guide_category_id is null));
-- Includes drafts and scheduled guides. The same event cannot race into two active articles.
create unique index articles_guide_event_unique on public.articles (guide_event_key)
  where is_strategy_guide and deleted_at is null and guide_event_key is not null;
create index articles_guide_directory_idx on public.articles (guide_category_id, guide_display_order)
  where is_strategy_guide and deleted_at is null;
alter table public.guide_categories enable row level security;
alter table public.guide_settings enable row level security;
create policy "guide categories are readable" on public.guide_categories for select to anon, authenticated using (true);
create policy "guide page status is readable" on public.guide_settings for select to anon, authenticated using (true);
grant select on public.guide_categories, public.guide_settings to anon, authenticated;
grant all on public.guide_categories, public.guide_settings to service_role;

-- Server-only, authenticated admin route calls this service-role-only transaction.
create function public.save_guide_configuration(configuration jsonb)
returns void language plpgsql security invoker set search_path = public
as $$
declare current_version timestamptz;
begin
  select updated_at into current_version from public.guide_settings where id = true for update;
  if current_version is distinct from (configuration->>'updatedAt')::timestamptz then
    raise exception 'guide_configuration_stale';
  end if;
  insert into public.guide_categories(id, name, display_order)
    select (item->>'id')::uuid, item->>'name', (item->>'displayOrder')::integer
    from jsonb_array_elements(configuration->'categories') item
    on conflict(id) do update set name = excluded.name, display_order = excluded.display_order;
  if exists (
    select 1 from jsonb_array_elements(configuration->'articles') item
    where not exists (select 1 from public.articles a where a.id = (item->>'id')::uuid and a.is_strategy_guide and a.deleted_at is null)
  ) then raise exception 'guide_article_changed'; end if;
  update public.articles a set
    guide_category_id = (item->>'categoryId')::uuid,
    guide_display_order = (item->>'displayOrder')::integer
    from jsonb_array_elements(configuration->'articles') item
    where a.id = (item->>'id')::uuid and a.is_strategy_guide and a.deleted_at is null;
  delete from public.guide_categories where id not in (
    select (item->>'id')::uuid from jsonb_array_elements(configuration->'categories') item
  );
  update public.guide_settings set preparing = (configuration->>'preparing')::boolean, updated_at = clock_timestamp() where id = true;
end;
$$;
revoke all on function public.save_guide_configuration(jsonb) from public, anon, authenticated;
grant execute on function public.save_guide_configuration(jsonb) to service_role;

create or replace function public.search_published_articles(
  search_query text default '',
  filter_tag_slug text default '',
  filter_destination text default 'articles',
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
security invoker
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
      and not articles.is_strategy_guide
      and articles.destination = case
        when filter_destination = 'guide' then 'guide'
        else 'articles'
      end
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

revoke all on function public.search_published_articles(text, text, text, integer, integer)
  from public;
grant execute on function public.search_published_articles(text, text, text, integer, integer)
  to anon, authenticated, service_role;
