-- Instagram comment-to-DM campaigns. Apply only after reviewing the Meta app setup.
create table public.instagram_dm_campaigns (
  id uuid primary key default gen_random_uuid(),
  month text not null check (month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  reel_media_id text not null check (length(reel_media_id) between 1 and 100),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index instagram_dm_one_active_campaign_per_reel
  on public.instagram_dm_campaigns (reel_media_id) where status = 'active';

create table public.instagram_dm_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.instagram_dm_campaigns(id) on delete restrict,
  character_name text not null check (length(character_name) between 1 and 80),
  keywords text[] not null check (cardinality(keywords) between 1 and 20),
  image_path text not null unique,
  dm_text text not null check (length(dm_text) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (campaign_id, character_name)
);
create index instagram_dm_assets_campaign_id_idx on public.instagram_dm_assets (campaign_id);

create table public.instagram_dm_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.instagram_dm_campaigns(id) on delete restrict,
  asset_id uuid not null references public.instagram_dm_assets(id) on delete restrict,
  comment_id text not null unique,
  commenter_id text not null,
  comment_text text not null,
  status text not null default 'pending_intro' check (status in (
    'pending_intro', 'awaiting_tap', 'pending_check', 'awaiting_follow',
    'pending_image', 'pending_text', 'pending_reply', 'complete',
    'failed', 'needs_review'
  )),
  follow_status text check (follow_status in ('following', 'not_following', 'unknown')),
  intro_message_id text,
  follow_message_id text,
  image_message_id text,
  text_message_id text,
  comment_reply_id text,
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index instagram_dm_deliveries_campaign_id_idx on public.instagram_dm_deliveries (campaign_id);
create unique index instagram_dm_one_delivery_per_person_per_campaign
  on public.instagram_dm_deliveries (campaign_id, commenter_id);
create index instagram_dm_deliveries_asset_id_idx on public.instagram_dm_deliveries (asset_id);
create index instagram_dm_deliveries_claim_idx
  on public.instagram_dm_deliveries (next_attempt_at, created_at)
  where status in ('pending_intro', 'pending_check', 'pending_image', 'pending_text', 'pending_reply');

alter table public.instagram_dm_campaigns enable row level security;
alter table public.instagram_dm_assets enable row level security;
alter table public.instagram_dm_deliveries enable row level security;
revoke all on public.instagram_dm_campaigns, public.instagram_dm_assets, public.instagram_dm_deliveries
  from public, anon, authenticated;
grant select, insert, update on public.instagram_dm_campaigns, public.instagram_dm_assets, public.instagram_dm_deliveries
  to service_role;

-- Lease work in short transactions; never hold a database lock during a Meta API request.
create function public.claim_instagram_dm_deliveries(batch_size integer)
returns setof public.instagram_dm_deliveries
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
    with picked as (
      select d.id
      from public.instagram_dm_deliveries d
      where d.status in ('pending_intro', 'pending_check', 'pending_image', 'pending_text', 'pending_reply')
        and d.next_attempt_at <= now()
        and (d.lease_until is null or d.lease_until < now())
      order by d.next_attempt_at, d.created_at
      limit least(greatest(coalesce(batch_size, 1), 1), 20)
      for update skip locked
    )
    update public.instagram_dm_deliveries d
    set lease_until = now() + interval '2 minutes', updated_at = now()
    from picked
    where d.id = picked.id
    returning d.*;
end;
$$;
revoke all on function public.claim_instagram_dm_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_instagram_dm_deliveries(integer) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('instagram-dm-images', 'instagram-dm-images', true, 8388608, array['image/png'])
on conflict (id) do nothing;
