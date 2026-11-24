-- Operational configuration, not a schema migration. Only the named official
-- monitor job is updated. Site URL and credentials remain in the existing Vault.
begin;

do $preflight$
begin
  if exists (
    select 1 from cron.job
    where jobname = 'harmony-palette-official-update-monitor'
      and username <> current_user
  ) then
    raise exception 'Run as the owner of the existing official monitor Cron job';
  end if;
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'harmony_palette_site_url' and decrypted_secret ~ '^https://'
  ) or not exists (
    select 1 from vault.decrypted_secrets
    where name = 'harmony_palette_cron_secret' and length(decrypted_secret) > 0
  ) then
    raise exception 'Configure the existing site URL and Cron secret in Vault first';
  end if;
end;
$preflight$;

select cron.schedule(
  'harmony-palette-official-update-monitor',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'harmony_palette_site_url'), '/') || '/api/cron/official-updates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'harmony_palette_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  )
  from public.official_monitor_settings as settings
  where settings.id = true
    and settings.enabled = true
    and (settings.next_run_at is null or settings.next_run_at <= now());
  $job$
);

commit;
