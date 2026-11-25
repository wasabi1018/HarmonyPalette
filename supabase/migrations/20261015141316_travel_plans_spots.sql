-- Travel plans themselves remain on the visitor's device. Only curated facilities
-- and article links live here. No personal itinerary data is collected.
create table public.travel_spots (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('hotel','meal','tour')),
  name text not null check (length(name) between 1 and 160),
  area text not null default '', address text not null default '', description text not null default '',
  facilities jsonb not null default '[]' check (jsonb_typeof(facilities) = 'array'),
  official_url text not null default '', booking_url text not null default '',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  photo_path text not null default '', photo_credit text not null default '', photo_expires_at date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index travel_spots_public_category_idx on public.travel_spots(category,name) where status = 'published';
create trigger travel_spots_updated before update on public.travel_spots for each row execute function public.set_updated_at();
create table public.travel_spot_private (
  spot_id uuid primary key references public.travel_spots(id) on delete cascade,
  internal_note text not null default ''
);
create table public.article_travel_metadata (
  article_id uuid primary key references public.articles(id) on delete cascade,
  disclosure text not null default '' check (length(disclosure) <= 1000)
);
create table public.article_spots (
  article_id uuid not null references public.articles(id) on delete cascade,
  spot_id uuid not null references public.travel_spots(id) on delete restrict,
  primary key (article_id,spot_id)
);
create index article_spots_spot_idx on public.article_spots(spot_id,article_id);
alter table public.travel_spots enable row level security;
alter table public.travel_spot_private enable row level security;
alter table public.article_travel_metadata enable row level security;
alter table public.article_spots enable row level security;
revoke all on public.travel_spots,public.travel_spot_private,public.article_travel_metadata,public.article_spots from anon,authenticated;
grant select on public.travel_spots,public.article_travel_metadata,public.article_spots to anon,authenticated;
grant all on public.travel_spots,public.travel_spot_private,public.article_travel_metadata,public.article_spots to service_role;
create policy travel_spots_public_read on public.travel_spots for select to anon,authenticated using (status = 'published');
create policy article_travel_public_read on public.article_travel_metadata for select to anon,authenticated using (
  exists (select 1 from public.articles a where a.id = article_id and a.status = 'published' and a.deleted_at is null and a.published_at <= now())
);
create policy article_spots_public_read on public.article_spots for select to anon,authenticated using (
  exists (select 1 from public.articles a where a.id = article_id and a.status = 'published' and a.deleted_at is null and a.published_at <= now())
  and exists (select 1 from public.travel_spots s where s.id = spot_id and s.status = 'published')
);

create function public.save_travel_spot(p_id uuid, p_input jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid;
begin
  insert into public.travel_spots(id,category,name,area,address,description,facilities,official_url,booking_url,status,photo_path,photo_credit,photo_expires_at)
  values(coalesce(p_id,gen_random_uuid()),p_input->>'category',p_input->>'name',p_input->>'area',p_input->>'address',p_input->>'description',p_input->'facilities',p_input->>'officialUrl',p_input->>'bookingUrl',p_input->>'status',p_input->>'photoPath',p_input->>'photoCredit',nullif(p_input->>'photoExpiresAt','')::date)
  on conflict(id) do update set category=excluded.category,name=excluded.name,area=excluded.area,address=excluded.address,description=excluded.description,facilities=excluded.facilities,official_url=excluded.official_url,booking_url=excluded.booking_url,status=excluded.status,photo_path=excluded.photo_path,photo_credit=excluded.photo_credit,photo_expires_at=excluded.photo_expires_at
  returning id into saved_id;
  insert into public.travel_spot_private(spot_id,internal_note) values(saved_id,p_input->>'internalNote')
  on conflict(spot_id) do update set internal_note=excluded.internal_note;
  return saved_id;
end $$;
revoke all on function public.save_travel_spot(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_travel_spot(uuid,jsonb) to service_role;

-- One transaction for article body, tags, disclosure, facility links and revision.
-- Missing travel metadata (e.g. an old revision) preserves the current disclosure.
create function public.save_article_with_travel(p_id uuid, p_input jsonb, p_user_id uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid; next_revision integer; travel jsonb; snapshot jsonb;
begin
  if p_id is not null then
    perform 1 from public.articles where id=p_id and deleted_at is null for update;
    if not found then return null; end if;
  end if;
  insert into public.articles(id,title,slug,excerpt,seo_title,seo_description,content_json,content_html,cover_image_url,status,destination,published_at,series_id,series_order,created_by,updated_by)
  values(coalesce(p_id,gen_random_uuid()),p_input->>'title',p_input->>'slug',p_input->>'excerpt',p_input->>'seoTitle',p_input->>'seoDescription',p_input->'contentJson',p_input->>'contentHtml',p_input->>'coverImageUrl',p_input->>'status',p_input->>'destination',nullif(p_input->>'publishedAt','')::timestamptz,nullif(p_input->>'seriesId','')::uuid,nullif(p_input->>'seriesOrder','')::integer,p_user_id,p_user_id)
  on conflict(id) do update set title=excluded.title,slug=excluded.slug,excerpt=excluded.excerpt,seo_title=excluded.seo_title,seo_description=excluded.seo_description,content_json=excluded.content_json,content_html=excluded.content_html,cover_image_url=excluded.cover_image_url,status=excluded.status,destination=excluded.destination,published_at=excluded.published_at,series_id=excluded.series_id,series_order=excluded.series_order,updated_by=excluded.updated_by
  returning id into saved_id;
  delete from public.article_tags where article_id=saved_id;
  insert into public.article_tags(article_id,tag_id) select saved_id,value::uuid from jsonb_array_elements_text(p_input->'tagIds') on conflict do nothing;
  if p_input ? 'travel' then
    travel := p_input->'travel';
    insert into public.article_travel_metadata(article_id,disclosure) values(saved_id,travel->>'disclosure')
    on conflict(article_id) do update set disclosure=excluded.disclosure;
    delete from public.article_spots where article_id=saved_id;
    insert into public.article_spots(article_id,spot_id) select saved_id,value::uuid from jsonb_array_elements_text(travel->'spotIds') on conflict do nothing;
  end if;
  select jsonb_build_object('disclosure',coalesce((select disclosure from public.article_travel_metadata where article_id=saved_id),''),'spotIds',coalesce((select jsonb_agg(spot_id order by spot_id) from public.article_spots where article_id=saved_id),'[]'::jsonb)) into travel;
  snapshot := p_input || jsonb_build_object('travel',travel);
  select coalesce(max(revision_number),0)+1 into next_revision from public.article_revisions where article_id=saved_id;
  insert into public.article_revisions(article_id,revision_number,snapshot,created_by) values(saved_id,next_revision,snapshot,p_user_id);
  return saved_id;
end $$;
revoke all on function public.save_article_with_travel(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_article_with_travel(uuid,jsonb,uuid) to service_role;

-- Photos are served through a checked endpoint; no public Storage object URL.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('travel-spot-images','travel-spot-images',false,5242880,array['image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
