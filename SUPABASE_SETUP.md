# Harmony Palette Supabase setup

Supabase is the canonical store for approved schedules and attraction operation data. Source PDFs, popup images, and official API responses are archived in the private `official-source-documents` bucket.

## 1. Apply the database schema

Open the Supabase SQL Editor for the project and run:

- `supabase/migrations/202607220001_schedule_import.sql`
- `supabase/migrations/202607220002_character_display_order.sql`
- `supabase/migrations/202607270001_articles.sql`
- `supabase/migrations/202607280001_article_operations.sql`
- `supabase/migrations/202607280002_article_trash.sql`
- `supabase/migrations/202607280003_article_media.sql`
- `supabase/migrations/202607280004_article_analytics.sql`
- `supabase/migrations/202607280005_article_search.sql`
- `supabase/migrations/202607280006_article_series.sql`
- `supabase/migrations/202607300001_plan_options.sql`
- `supabase/migrations/202607300002_plan_options_seed.sql`
- `supabase/migrations/202608030001_site_analytics.sql`
- `supabase/migrations/202608030002_site_analytics_plan_exports.sql`
- `supabase/migrations/202608110001_park_operating_days.sql`
- `supabase/migrations/202608110002_fix_publish_import_run_operating_day_filter.sql`
- `supabase/migrations/202608150001_official_update_monitor.sql`
- `supabase/migrations/202608170001_schedule_withdrawal_and_fanstudio_reconciliation.sql`

This creates the import history, source documents, schedule versions, character
relations, attraction operation data, article and tag tables, public read
policies, the private source-document bucket, and the public `article-images`
bucket used by the article editor. The final migration adds scheduled
publication, SEO fields, and article revision history.
The trash migration adds recoverable deletion and ensures removed articles are
excluded from public reads.
The media migration records uploaded image metadata and alternative text for
reuse in the article editor.
The analytics migration stores privacy-friendly daily article view totals
without IP addresses, cookies, or user-agent data.
The site analytics migration adds the same privacy-friendly daily totals for
TOP page visits, newly created My Plans, plan image saves, and plan shares.
The park operating-days migration adds reviewable and publishable opening,
closing, and closed-day data sourced from the official calendar.
The search migration adds Japanese-friendly partial matching indexes and a
published-article search function.
The series migration groups ordered articles into public reading collections.

## 2. Configure server-only secrets

Copy `.env.example` to `.env.local` and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://bnbdwstvrjgmfftmmofx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_SITE_URL=https://your-public-site.example
SUPABASE_SECRET_KEY=your_secret_key
ADMIN_EMAILS=admin@example.com
ADMIN_IMPORT_SECRET=your_long_random_admin_secret
CRON_SECRET=your_long_random_cron_secret
# Optional Discord fallback. Prefer configuring it from /admin/official-updates.
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_id/your_webhook_token
```

Never expose `SUPABASE_SECRET_KEY`, `ADMIN_EMAILS`, `ADMIN_IMPORT_SECRET`, or `CRON_SECRET` to browser code or commit them to source control.

## 3. Create the first administrator

1. Open **Authentication → Users** in the Supabase dashboard.
2. Create a user with an email address and password.
3. Add the same email address to `ADMIN_EMAILS` in `.env.local`.
4. Restart the application and open `/admin/login`.

As an alternative to `ADMIN_EMAILS`, a user whose Auth `app_metadata.role` is
`admin` can access the management console. The public site does not share the
admin layout, and protected admin pages redirect signed-out or unauthorized
users to `/admin/login`.

## 4. Manual import

Restart the app, sign in at `/admin/login`, open `/admin/schedule`, choose a date range, and fetch candidates. Review the parsed schedules and attraction operations before publishing selected rows.

`ADMIN_IMPORT_SECRET` remains available as a legacy bearer token for CLI or
external admin API integrations, but the browser management console uses the
authenticated admin session.

The command-line importer is also available:

```powershell
npm.cmd run import:official -- --from 2026-07-22 --to 2026-07-22 --fanstudio --persist
```

## 5. Article publishing

After applying the articles migration, sign in and open `/admin/articles`.

- Create or edit article text with headings, lists, quotes, links, underline,
  bold, italic, and font colors.
- Upload a cover image or insert images into the body. Images are stored in the
  public `article-images` bucket and limited to 10MB each.
- Assign tags, preview the unsaved article, then save it as a draft or publish
  it.
- Choose **予約公開** and a future date to publish through the scheduled batch.
- Configure the search title and description, and restore an earlier saved
  revision when needed.
- Existing drafts are automatically saved after 15 seconds of unsaved editing.
- Duplicate an article as a new draft, or move an article to the trash and
  restore it later. Permanent deletion is only available inside the trash.
- Open `/admin/media` to upload reusable images and maintain alternative text.
  Images referenced by a current article or revision cannot be deleted.
- Open `/admin/analytics` to compare 7, 30, or 90 days of TOP page visits,
  newly created My Plans, plan image saves, plan shares, and article traffic,
  review popular articles, and export the aggregate data as CSV.
- Readers can combine text search and tag filters on `/articles`, move through
  paginated results, and discover related articles on each detail page.
- Readers can use an automatically generated table of contents, reading-time
  estimate, share/copy/print controls, RSS, and JSON Feed. These delivery
  features do not require an additional database migration.
- Editors see a real-time publication quality score for titles, search
  metadata, heading order, image alternative text, link URLs, internal link
  availability, cover images, and tags. Publication warns about remaining
  issues without interrupting draft or automatic saves.
- Open `/admin/series` to create an article series, then choose the series and
  reading order in the article editor. Published series have their own landing
  pages and previous/next article navigation.
- Open `/admin/backup` to download a complete JSON data backup or a CSV article
  catalog. Media metadata and URLs are included, but image binaries remain in
  Supabase Storage.
- Published articles appear under `/articles`; readers can filter them by tag.

## 6. Official update monitor

The old unconditional schedule-import Cron has been removed. Open
`/admin/official-updates`, save a Discord Incoming Webhook, select a time in
15-minute increments, and enable monitoring. The first run records a baseline
without sending a notification. Later source changes are hashed first; only
changed dates are parsed and saved as reviewable drafts. Nothing is published
until an administrator selects the semantic diffs and confirms them.

The monitor uses Supabase Cron because Vercel Hobby Cron is limited to one run
per day. Store the deployed site URL and the same `CRON_SECRET` used by the
Vercel environment in Supabase Vault, then schedule a lightweight 15-minute call:

```sql
select vault.create_secret('https://your-public-site.example', 'harmony_palette_site_url');
select vault.create_secret('replace-with-the-vercel-cron-secret', 'harmony_palette_cron_secret');

select cron.schedule(
  'harmony-palette-official-update-monitor',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'harmony_palette_site_url') || '/api/cron/official-updates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'harmony_palette_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

The endpoint checks `next_run_at`, so 15-minute calls normally return without
fetching the official site. While changed dates are queued, one heavy import is
processed per call. Only changed originals are retained; the default internal
cap is 150MB and can be adjusted in the admin UI. The cap is calculated from
the entire private source-document bucket.

`vercel.json` still calls `/api/cron/publish-articles` once per day to publish due
articles. Cron endpoints require:

```text
Authorization: Bearer <CRON_SECRET>
```

## 7. Read APIs

- Published schedules: `/api/schedules`
- Published attraction operations: `/api/operations?date=YYYY-MM-DD`

The operations API is ready for a future “today's operation status” section.
