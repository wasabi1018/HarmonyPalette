create table if not exists public.site_daily_events (
  event_name text not null,
  event_date date not null,
  event_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (event_name, event_date),
  constraint site_daily_events_name_valid check (
    event_name in ('home_view', 'plan_created')
  ),
  constraint site_daily_events_count_nonnegative check (event_count >= 0)
);

create index if not exists site_daily_events_date_idx
  on public.site_daily_events (event_date desc);

alter table public.site_daily_events enable row level security;

grant all on public.site_daily_events to service_role;

create or replace function public.increment_site_analytics_event(site_event_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_date date;
begin
  if site_event_name not in ('home_view', 'plan_created') then
    return false;
  end if;

  target_date := timezone('Asia/Tokyo', now())::date;

  insert into public.site_daily_events (
    event_name,
    event_date,
    event_count,
    updated_at
  )
  values (site_event_name, target_date, 1, now())
  on conflict (event_name, event_date)
  do update set
    event_count = public.site_daily_events.event_count + 1,
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.increment_site_analytics_event(text) from public;
grant execute on function public.increment_site_analytics_event(text) to service_role;
