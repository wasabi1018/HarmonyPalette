import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
// Isolated PostgreSQL fixture. Never reads .env or connects to hosted Supabase.
export async function createHotelTestDatabase() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
    create table public.articles(id uuid primary key default gen_random_uuid(),title text,slug text unique,excerpt text,seo_title text,seo_description text,content_json jsonb,content_html text,cover_image_url text,status text,destination text,published_at timestamptz,series_id uuid,series_order integer,created_by uuid,updated_by uuid,deleted_at timestamptz,updated_at timestamptz default now());
    create table public.tags(id uuid primary key);
    create table public.article_tags(article_id uuid references public.articles(id),tag_id uuid references public.tags(id),primary key(article_id,tag_id));
    create table public.article_revisions(article_id uuid references public.articles(id),revision_number integer,snapshot jsonb,created_by uuid,unique(article_id,revision_number));
    alter table public.articles enable row level security;
    create policy articles_public on public.articles for select to anon,authenticated using(status='published' and deleted_at is null and published_at<=now());
    grant usage on schema public to anon,authenticated,service_role;
    grant select on public.articles to anon,authenticated; grant all on all tables in schema public to service_role;`);
  for (const filename of [
    "20261126132102_travel_plans_spots.sql",
    "20261126132743_hotel_guide.sql",
  ])
    await db.exec(await readFile(`supabase/migrations/${filename}`, "utf8"));
  return db;
}
