alter table public.characters
add column if not exists birthday_month smallint,
add column if not exists birthday_day smallint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'characters_birthday_valid_check'
      and conrelid = 'public.characters'::regclass
  ) then
    alter table public.characters
    add constraint characters_birthday_valid_check
    check (
      (birthday_month is null and birthday_day is null)
      or (
        birthday_month is not null
        and birthday_day is not null
        and birthday_month between 1 and 12
        and birthday_day between 1 and case
          when birthday_month = 2 then 29
          when birthday_month in (4, 6, 9, 11) then 30
          else 31
        end
      )
    );
  end if;
end
$$;

comment on column public.characters.birthday_month is
'Character birthday month (1-12). Must be set together with birthday_day.';

comment on column public.characters.birthday_day is
'Character birthday day. Must be set together with birthday_month.';
