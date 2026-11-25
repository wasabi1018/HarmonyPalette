-- Requires 20261015141316_travel_plans_spots.sql. Apply only after explicit approval.
create table public.hotel_areas (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 1 and 80),
  sort_order integer not null default 0 check (sort_order between 0 and 100000), active boolean not null default true
);
create table public.hotel_tags (like public.hotel_areas including all);
insert into public.hotel_areas(id,name,sort_order) values
 ('hiji','日出町',10),('beppu','別府市',20),('kitsuki','杵築市',30),('oita','大分市',40),('other','その他の周辺エリア',50);
insert into public.hotel_tags(id,name,sort_order) values
 ('nearby','ハーモニーランドに近い',10),('family','子連れ・ファミリー向け',20),('budget','リーズナブル',30),('bath','温泉・大浴場あり',40),('resort','リゾートホテル',50),('japanese-room','和室あり',60),('bed-sharing','添い寝対応',70),('free-parking','無料駐車場あり',80);

create table public.hotels (
  id uuid primary key references public.travel_spots(id) on delete restrict,
  slug text not null unique check (length(slug) between 1 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  area_id text not null references public.hotel_areas(id) on delete restrict,
  drive_minutes integer check (drive_minutes between 1 and 600), drive_minutes_max integer,
  sort_order integer not null default 100 check (sort_order between 0 and 100000),
  recommended boolean not null default false, allow_index boolean not null default false,
  details jsonb not null default '{}' check (jsonb_typeof(details)='object' and octet_length(details::text)<=100000),
  pr_enabled boolean not null default false, pr_starts_at timestamptz, pr_ends_at timestamptz,
  pr_order integer not null default 100 check (pr_order between 0 and 100000),
  deleted_at timestamptz, updated_at timestamptz not null default now(),
  check (drive_minutes_max is null or (drive_minutes is not null and drive_minutes_max between drive_minutes and 600)),
  check (not pr_enabled or (pr_starts_at is not null and pr_ends_at is not null and length(details->>'disclosure')>0)),
  check (pr_starts_at is null or pr_ends_at is null or pr_starts_at<pr_ends_at),
  check (drive_minutes is null or (coalesce(details->>'driveSourceUrl','') ~ '^https://' and coalesce(details->>'driveCheckedOn','') ~ '^\d{4}-\d{2}-\d{2}$'))
);
create index hotels_public_order_idx on public.hotels(sort_order,id) where deleted_at is null;
create index hotels_area_idx on public.hotels(area_id) where deleted_at is null;
create index hotels_drive_idx on public.hotels(drive_minutes_max,drive_minutes) where deleted_at is null;
create trigger hotels_updated before update on public.hotels for each row execute function public.set_updated_at();
create table public.hotel_images (
  id uuid primary key, hotel_id uuid not null references public.hotels(id) on delete cascade,
  sort_order integer not null, image jsonb not null check(jsonb_typeof(image)='object'),
  check (length(image->>'credit')>0 and length(image->>'license')>0 and length(image->>'alt')>0)
);
create index hotel_images_hotel_idx on public.hotel_images(hotel_id,sort_order);
create table public.hotel_booking_links (
  id uuid primary key, hotel_id uuid not null references public.hotels(id) on delete cascade,
  sort_order integer not null, provider text not null, label text not null,
  url text not null check(url ~ '^https://'), is_primary boolean not null default false
);
create unique index hotel_primary_booking_idx on public.hotel_booking_links(hotel_id) where is_primary;
create index hotel_links_hotel_idx on public.hotel_booking_links(hotel_id,sort_order);
create table public.hotel_tag_relations (
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  tag_id text not null references public.hotel_tags(id) on delete restrict, primary key(hotel_id,tag_id)
);
create index hotel_tags_reverse_idx on public.hotel_tag_relations(tag_id,hotel_id);

alter table public.hotel_areas enable row level security;
alter table public.hotel_tags enable row level security;
alter table public.hotels enable row level security;
alter table public.hotel_images enable row level security;
alter table public.hotel_booking_links enable row level security;
alter table public.hotel_tag_relations enable row level security;
revoke all on public.hotel_areas,public.hotel_tags,public.hotels,public.hotel_images,public.hotel_booking_links,public.hotel_tag_relations from anon,authenticated;
grant select on public.hotel_areas,public.hotel_tags,public.hotels,public.hotel_images,public.hotel_booking_links,public.hotel_tag_relations to anon,authenticated;
grant all on public.hotel_areas,public.hotel_tags,public.hotels,public.hotel_images,public.hotel_booking_links,public.hotel_tag_relations to service_role;
create policy hotel_areas_read on public.hotel_areas for select to anon,authenticated using(active);
create policy hotel_tags_read on public.hotel_tags for select to anon,authenticated using(active);
create policy hotels_read on public.hotels for select to anon,authenticated using(deleted_at is null and exists(select 1 from public.travel_spots s where s.id=hotels.id and s.category='hotel' and s.status='published'));
create policy hotel_images_read on public.hotel_images for select to anon,authenticated using(
 exists(select 1 from public.hotels h where h.id=hotel_id) and (nullif(image->>'expiresOn','') is null or (image->>'expiresOn')::date >= (now() at time zone 'Asia/Tokyo')::date)
);
create policy hotel_booking_links_read on public.hotel_booking_links for select to anon,authenticated using(exists(select 1 from public.hotels h where h.id=hotel_id));
create policy hotel_tag_relations_read on public.hotel_tag_relations for select to anon,authenticated using(exists(select 1 from public.hotels h where h.id=hotel_id));

create function public.save_hotel(p_input jsonb, p_expected_updated_at timestamptz default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare hid uuid := (p_input->>'id')::uuid; previous public.hotels; item jsonb; ordinal bigint;
begin
 select * into previous from public.hotels where id=hid for update;
 if found and (p_expected_updated_at is null or previous.updated_at<>p_expected_updated_at) then raise exception 'hotel_stale'; end if;
 if previous.deleted_at is not null then raise exception 'hotel_deleted'; end if;
 if exists(select 1 from public.travel_spots where id=hid and category<>'hotel') then raise exception 'not_hotel'; end if;
 if exists(select 1 from public.hotels where id=hid) and previous.slug<>(p_input->>'slug') then raise exception 'hotel_slug_locked'; end if;
 if jsonb_array_length(p_input->'images')>12 or jsonb_array_length(p_input->'bookingLinks')>10 or jsonb_array_length(p_input->'tagIds')>30 then raise exception 'too_many_items'; end if;
 insert into public.travel_spots(id,category,name,area,address,description,official_url,status)
 values(hid,'hotel',p_input->>'name',(select name from public.hotel_areas where id=p_input->>'areaId'),p_input->>'address',p_input->>'summary',p_input->>'officialUrl',p_input->>'status')
 on conflict(id) do update set name=excluded.name,area=excluded.area,address=excluded.address,description=excluded.description,official_url=excluded.official_url,status=excluded.status;
 insert into public.hotels(id,slug,area_id,drive_minutes,drive_minutes_max,sort_order,recommended,allow_index,pr_enabled,pr_starts_at,pr_ends_at,pr_order,details)
 values(hid,p_input->>'slug',p_input->>'areaId',(p_input->>'driveMinutes')::int,(p_input->>'driveMinutesMax')::int,(p_input->>'sortOrder')::int,(p_input->>'recommended')::boolean,(p_input->>'allowIndex')::boolean,(p_input->>'prEnabled')::boolean,(p_input->>'prStartsAt')::timestamptz,(p_input->>'prEndsAt')::timestamptz,(p_input->>'prOrder')::int,p_input-array['id','slug','areaId','name','address','summary','officialUrl','status','deletedAt','updatedAt','sortOrder','recommended','allowIndex','prEnabled','prStartsAt','prEndsAt','prOrder','driveMinutes','driveMinutesMax','images','bookingLinks','tagIds'])
 on conflict(id) do update set area_id=excluded.area_id,drive_minutes=excluded.drive_minutes,drive_minutes_max=excluded.drive_minutes_max,sort_order=excluded.sort_order,recommended=excluded.recommended,allow_index=excluded.allow_index,pr_enabled=excluded.pr_enabled,pr_starts_at=excluded.pr_starts_at,pr_ends_at=excluded.pr_ends_at,pr_order=excluded.pr_order,details=excluded.details;
 delete from public.hotel_images where hotel_id=hid;
 delete from public.hotel_booking_links where hotel_id=hid;
 delete from public.hotel_tag_relations where hotel_id=hid;
 for item,ordinal in select value,ordinality from jsonb_array_elements(p_input->'bookingLinks') with ordinality loop
  insert into public.hotel_booking_links(id,hotel_id,sort_order,provider,label,url,is_primary) values((item->>'id')::uuid,hid,ordinal,item->>'provider',item->>'label',item->>'url',(item->>'primary')::boolean);
 end loop;
 for item,ordinal in select value,ordinality from jsonb_array_elements(p_input->'images') with ordinality loop
  insert into public.hotel_images(id,hotel_id,sort_order,image) values((item->>'id')::uuid,hid,ordinal,item);
 end loop;
 insert into public.hotel_tag_relations(hotel_id,tag_id) select hid,value from jsonb_array_elements_text(p_input->'tagIds');
 return hid;
end $$;
create function public.set_hotel_deleted(p_id uuid,p_deleted boolean,p_expected_updated_at timestamptz) returns void
language plpgsql security invoker set search_path='' as $$
declare current_version timestamptz;
begin
 select updated_at into current_version from public.hotels where id=p_id for update;
 if not found or current_version<>p_expected_updated_at then raise exception 'hotel_stale'; end if;
 update public.hotels set deleted_at=case when p_deleted then now() else null end where id=p_id;
 -- Restoring always returns to draft, never silently republishes.
 update public.travel_spots set status=case when p_deleted then 'archived' else 'draft' end where id=p_id;
end $$;
revoke all on function public.save_hotel(jsonb,timestamptz),public.set_hotel_deleted(uuid,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.save_hotel(jsonb,timestamptz),public.set_hotel_deleted(uuid,boolean,timestamptz) to service_role;

-- Public image URLs are never exposed for uploads. Both variants stay private.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hotel-images','hotel-images',false,5242880,array['image/webp']);

-- Article-specific opt-in, saved atomically with existing travel metadata/revisions.
alter table public.article_travel_metadata add column show_hotel_guide boolean not null default false;
-- Keep the existing RPC implementation and add the optional field in the same transaction.
alter function public.save_article_with_travel(uuid,jsonb,uuid) rename to save_article_with_travel_base;
create function public.save_article_with_travel(p_id uuid,p_input jsonb,p_user_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare aid uuid; travel_snapshot jsonb;
begin
 aid := public.save_article_with_travel_base(p_id,p_input,p_user_id);
 if aid is null then return null; end if;
 if p_input->'travel' ? 'showHotelGuide' then
  insert into public.article_travel_metadata(article_id,show_hotel_guide) values(aid,(p_input->'travel'->>'showHotelGuide')::boolean)
  on conflict(article_id) do update set show_hotel_guide=excluded.show_hotel_guide;
 end if;
 select jsonb_build_object('disclosure',disclosure,'spotIds',coalesce((select jsonb_agg(spot_id order by spot_id) from public.article_spots where article_id=aid),'[]'::jsonb),'showHotelGuide',show_hotel_guide) into travel_snapshot from public.article_travel_metadata where article_id=aid;
 if travel_snapshot is not null then update public.article_revisions set snapshot=jsonb_set(article_revisions.snapshot,'{travel}',travel_snapshot) where article_id=aid and revision_number=(select max(revision_number) from public.article_revisions where article_id=aid); end if;
 return aid;
end $$;
revoke all on function public.save_article_with_travel(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_article_with_travel(uuid,jsonb,uuid) to service_role;

create table public.hotel_daily_events (
 event_date date not null, event_name text not null check(event_name in ('hotel_list_view','hotel_view','booking_click','hotel_guide_click','pr_impression','pr_click')),
 hotel_id text not null default '', provider text not null default '', source text not null default 'direct', placement text not null default 'list',
 event_count bigint not null default 0 check(event_count>=0),
 primary key(event_date,event_name,hotel_id,provider,source,placement)
);
alter table public.hotel_daily_events enable row level security;
revoke all on public.hotel_daily_events from public,anon,authenticated;
grant all on public.hotel_daily_events to service_role;
create function public.record_hotel_events(p_events jsonb) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>40 then raise exception 'invalid_events'; end if;
 insert into public.hotel_daily_events(event_date,event_name,hotel_id,provider,source,placement,event_count)
 select (now() at time zone 'Asia/Tokyo')::date,e->>'event',coalesce(e->>'hotelId',''),coalesce(e->>'provider',''),e->>'source',e->>'placement',count(*)
 from jsonb_array_elements(p_events) e
 where e->>'event' in ('hotel_list_view','hotel_view','booking_click','hotel_guide_click','pr_impression','pr_click')
 and e->>'source' in ('direct','external','home','crowd','plan','article','navigation','list','detail')
 and e->>'placement' in ('list','detail','pr','cta')
 and (e->>'event' in ('hotel_list_view','hotel_guide_click') or exists(select 1 from public.hotels h join public.travel_spots s on s.id=h.id where h.id::text=e->>'hotelId' and h.deleted_at is null and s.status='published'
   and (e->>'event' not in ('booking_click','pr_click') or exists(select 1 from public.hotel_booking_links l where l.hotel_id=h.id and l.provider=e->>'provider'))
   and (e->>'event' not in ('pr_impression','pr_click') or (h.pr_enabled and h.pr_starts_at<=now() and now()<h.pr_ends_at))))
 group by e->>'event',coalesce(e->>'hotelId',''),coalesce(e->>'provider',''),e->>'source',e->>'placement'
 on conflict(event_date,event_name,hotel_id,provider,source,placement) do update set event_count=hotel_daily_events.event_count+excluded.event_count;
end $$;
revoke all on function public.record_hotel_events(jsonb) from public,anon,authenticated;
grant execute on function public.record_hotel_events(jsonb) to service_role;
