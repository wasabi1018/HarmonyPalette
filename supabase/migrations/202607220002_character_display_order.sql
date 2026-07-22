alter table public.characters
add column if not exists display_order integer not null default 999;

update public.characters
set display_order = 999
where display_order is null;

-- 既存の取込済み予定にだけ存在するキャラクターも台帳へ移します。
insert into public.characters (
  id,
  slug,
  name,
  name_kana,
  image_url,
  official_url,
  is_fan_studio_regular,
  theme_color,
  display_order
)
select
  'imported-' || substr(md5(sc.character_name), 1, 16),
  'imported-' || substr(md5(sc.character_name), 1, 16),
  sc.character_name,
  '',
  '/character-placeholder.svg',
  'https://www.harmonyland.jp/',
  false,
  '#ef8099',
  999
from (
  select distinct character_name
  from public.schedule_characters
) sc
where not exists (
  select 1
  from public.characters c
  where c.name = sc.character_name
)
on conflict (id) do nothing;

-- 以前の取込でキャラクターIDが空だった出演情報を、台帳へ結び直します。
update public.schedule_characters sc
set character_id = c.id
from public.characters c
where sc.character_id is null
  and c.name = sc.character_name;

create index if not exists characters_display_order_idx
on public.characters (display_order, name, id);
