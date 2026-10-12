-- Queue the public comment reply independently after the initial private DM.
-- Deliveries past the initial DM keep their original reply timing.
alter table public.instagram_dm_deliveries
  add column comment_reply_status text not null default 'not_ready'
    check (comment_reply_status in ('not_ready', 'pending', 'sent', 'failed', 'needs_review')),
  add column comment_reply_attempt_count integer not null default 0
    check (comment_reply_attempt_count between 0 and 20),
  add column comment_reply_next_attempt_at timestamptz not null default now(),
  add column comment_reply_lease_until timestamptz,
  add column comment_reply_last_error text;

update public.instagram_dm_deliveries
set comment_reply_status = 'sent'
where comment_reply_id is not null;

create index instagram_dm_comment_replies_claim_idx
  on public.instagram_dm_deliveries (comment_reply_next_attempt_at, created_at)
  where comment_reply_status = 'pending';

create function public.claim_instagram_dm_comment_replies(batch_size integer)
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
      join public.instagram_dm_campaigns c on c.id = d.campaign_id
      where d.comment_reply_status = 'pending'
        and c.status = 'active'
        and d.comment_reply_next_attempt_at <= now()
        and (d.comment_reply_lease_until is null or d.comment_reply_lease_until < now())
      order by d.comment_reply_next_attempt_at, d.created_at
      limit least(greatest(coalesce(batch_size, 1), 1), 20)
      for update of d skip locked
    )
    update public.instagram_dm_deliveries d
    set comment_reply_lease_until = now() + interval '2 minutes', updated_at = now()
    from picked
    where d.id = picked.id
    returning d.*;
end;
$$;

revoke all on function public.claim_instagram_dm_comment_replies(integer) from public, anon, authenticated;
grant execute on function public.claim_instagram_dm_comment_replies(integer) to service_role;
