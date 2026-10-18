-- Private snapshot: public routes explicitly project a score-free DTO.
create table public.crowd_forecast_state (
  id text primary key check (id = 'main'),
  revision bigint not null default 0,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  lease_token uuid,
  lease_until timestamptz,
  last_attempt_day date,
  updated_at timestamptz not null default now()
);
alter table public.crowd_forecast_state enable row level security;
revoke all on public.crowd_forecast_state from public, anon, authenticated;
grant select, update on public.crowd_forecast_state to service_role;
insert into public.crowd_forecast_state(id) values ('main');

create function public.crowd_forecast_claim(p_day date, p_token uuid)
returns setof public.crowd_forecast_state
language sql security invoker set search_path = '' as $$
  update public.crowd_forecast_state
  set lease_token = p_token, lease_until = now() + interval '5 minutes',
      last_attempt_day = p_day, revision = revision + 1
  where id = 'main' and last_attempt_day is distinct from p_day
    and (lease_until is null or lease_until <= now())
    and p_day = (now() at time zone 'Asia/Tokyo')::date
  returning *;
$$;

create function public.crowd_forecast_write(p_revision bigint, p_payload jsonb, p_token uuid default null)
returns setof public.crowd_forecast_state
language sql security invoker set search_path = '' as $$
  update public.crowd_forecast_state
  set payload = p_payload, revision = revision + 1, updated_at = now(), lease_token = null, lease_until = null
  where id = 'main' and revision = p_revision
    and octet_length(p_payload::text) <= 4000000
    and ((p_token is null and (lease_until is null or lease_until <= now()))
      or (p_token is not null and lease_token = p_token and lease_until > now()))
  returning *;
$$;
revoke all on function public.crowd_forecast_claim(date, uuid) from public, anon, authenticated;
revoke all on function public.crowd_forecast_write(bigint, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.crowd_forecast_claim(date, uuid) to service_role;
grant execute on function public.crowd_forecast_write(bigint, jsonb, uuid) to service_role;
