create table if not exists public.plan_facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_order integer not null default 999 check (display_order between 0 and 999999),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_attractions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  facility_id uuid references public.plan_facilities(id) on delete set null,
  display_order integer not null default 999 check (display_order between 0 and 999999),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists plan_facilities_name_unique_idx
  on public.plan_facilities (lower(name));
create unique index if not exists plan_attractions_name_unique_idx
  on public.plan_attractions (lower(name));
create index if not exists plan_facilities_order_idx
  on public.plan_facilities (is_active desc, display_order, name);
create index if not exists plan_attractions_order_idx
  on public.plan_attractions (is_active desc, display_order, name);

drop trigger if exists plan_facilities_set_updated_at on public.plan_facilities;
create trigger plan_facilities_set_updated_at before update on public.plan_facilities
for each row execute function public.set_updated_at();

drop trigger if exists plan_attractions_set_updated_at on public.plan_attractions;
create trigger plan_attractions_set_updated_at before update on public.plan_attractions
for each row execute function public.set_updated_at();

alter table public.plan_facilities enable row level security;
alter table public.plan_attractions enable row level security;

drop policy if exists "active plan facilities are readable" on public.plan_facilities;
create policy "active plan facilities are readable"
on public.plan_facilities for select to anon, authenticated
using (is_active = true);

drop policy if exists "active plan attractions are readable" on public.plan_attractions;
create policy "active plan attractions are readable"
on public.plan_attractions for select to anon, authenticated
using (is_active = true);

grant select on public.plan_facilities, public.plan_attractions to anon, authenticated;
grant all on public.plan_facilities, public.plan_attractions to service_role;
