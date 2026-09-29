-- Count a browser at most once per Japan-time day without retaining a cross-day identifier.
create table if not exists public.site_daily_unique_visitors (
  visit_date date not null,
  visitor_hash text not null,
  created_at timestamptz not null default now(),
  primary key (visit_date, visitor_hash),
  constraint site_daily_unique_visitors_hash_valid check (
    visitor_hash ~ '^[0-9a-f]{64}$'
  )
);

alter table public.site_daily_unique_visitors enable row level security;

revoke all on table public.site_daily_unique_visitors from public, anon, authenticated;
grant select, insert, delete on table public.site_daily_unique_visitors to service_role;

alter table public.site_daily_events
  drop constraint if exists site_daily_events_name_valid;

alter table public.site_daily_events
  add constraint site_daily_events_name_valid check (
    event_name in (
      'home_view',
      'plan_created',
      'plan_image_saved',
      'plan_shared',
      'unique_visitor'
    )
  );

create or replace function public.record_daily_unique_visitor(
  visitor_date_arg date,
  visitor_hash_arg text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_count integer;
  server_date date;
begin
  server_date := (statement_timestamp() at time zone 'Asia/Tokyo')::date;

  if visitor_date_arg is null
    or visitor_hash_arg is null
    or visitor_date_arg <> server_date
    or visitor_hash_arg !~ '^[0-9a-f]{64}$'
  then
    return false;
  end if;

  delete from public.site_daily_unique_visitors
  where visit_date < server_date - 1;

  insert into public.site_daily_unique_visitors (
    visit_date,
    visitor_hash
  )
  values (
    visitor_date_arg,
    visitor_hash_arg
  )
  on conflict (visit_date, visitor_hash) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    return false;
  end if;

  insert into public.site_daily_events (
    event_name,
    event_date,
    event_count,
    updated_at
  )
  values (
    'unique_visitor',
    visitor_date_arg,
    1,
    now()
  )
  on conflict (event_name, event_date)
  do update set
    event_count = public.site_daily_events.event_count + 1,
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.record_daily_unique_visitor(date, text)
  from public, anon, authenticated;
grant execute on function public.record_daily_unique_visitor(date, text)
  to service_role;
