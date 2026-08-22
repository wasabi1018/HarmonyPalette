alter table public.official_monitor_settings
  alter column retention_days set default 45;

update public.official_monitor_settings
set retention_days = 45;

with ranked_revisions as (
  select
    id,
    row_number() over (
      partition by article_id
      order by revision_number desc, created_at desc, id desc
    ) as history_position
  from public.article_revisions
)
delete from public.article_revisions
where id in (
  select id
  from ranked_revisions
  where history_position > 10
);

create or replace function public.prune_article_revision_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.article_revisions
  where article_id = new.article_id
    and id not in (
      select id
      from public.article_revisions
      where article_id = new.article_id
      order by revision_number desc, created_at desc, id desc
      limit 10
    );

  return new;
end;
$$;

revoke all on function public.prune_article_revision_history() from public, anon, authenticated;
grant execute on function public.prune_article_revision_history() to service_role;

drop trigger if exists article_revisions_keep_latest on public.article_revisions;
create trigger article_revisions_keep_latest
after insert on public.article_revisions
for each row
execute function public.prune_article_revision_history();
