alter table public.site_daily_events
  drop constraint if exists site_daily_events_name_valid;

alter table public.site_daily_events
  add constraint site_daily_events_name_valid check (
    event_name in (
      'home_view',
      'plan_created',
      'plan_image_saved',
      'plan_shared'
    )
  );

create or replace function public.increment_site_analytics_event(site_event_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_date date;
begin
  if site_event_name not in (
    'home_view',
    'plan_created',
    'plan_image_saved',
    'plan_shared'
  ) then
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
