create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  color text not null default '#eb6e98',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_length check (char_length(name) between 1 and 40),
  constraint tags_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  constraint tags_color_format check (color ~ '^#[0-9a-fA-F]{6}$')
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content_json jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  content_html text not null default '<p></p>',
  cover_image_url text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_title_length check (char_length(title) between 1 and 160),
  constraint articles_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,119}$'),
  constraint articles_excerpt_length check (char_length(excerpt) <= 240)
);

create table if not exists public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

create index if not exists articles_status_published_idx
  on public.articles (status, published_at desc, updated_at desc);
create index if not exists article_tags_tag_idx
  on public.article_tags (tag_id, article_id);

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at before update on public.articles
for each row execute function public.set_updated_at();

drop trigger if exists tags_set_updated_at on public.tags;
create trigger tags_set_updated_at before update on public.tags
for each row execute function public.set_updated_at();

alter table public.articles enable row level security;
alter table public.tags enable row level security;
alter table public.article_tags enable row level security;

drop policy if exists "published articles are readable" on public.articles;
create policy "published articles are readable" on public.articles
for select to anon, authenticated
using (status = 'published');

drop policy if exists "article tags are readable" on public.tags;
create policy "article tags are readable" on public.tags
for select to anon, authenticated
using (true);

drop policy if exists "published article tag relations are readable" on public.article_tags;
create policy "published article tag relations are readable" on public.article_tags
for select to anon, authenticated
using (
  exists (
    select 1
    from public.articles
    where articles.id = article_tags.article_id
      and articles.status = 'published'
  )
);

grant select on public.articles, public.tags, public.article_tags to anon, authenticated;
grant all on public.articles, public.tags, public.article_tags to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-images',
  'article-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public.tags (name, slug, color)
values
  ('初心者ガイド', 'beginner-guide', '#eb6e98'),
  ('楽しみ方', 'how-to-enjoy', '#a88ad4'),
  ('おすすめ', 'recommendation', '#6db99e')
on conflict (slug) do nothing;
