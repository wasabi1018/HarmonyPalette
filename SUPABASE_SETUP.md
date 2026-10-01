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
- `supabase/migrations/20260821234044_free_plan_usage_guards.sql`
- `supabase/migrations/20260822001455_retention_and_revision_limits.sql`
- `supabase/migrations/20260929061751_daily_unique_visitors.sql`

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
The daily unique-visitors migration adds same-day browser deduplication. It
stores only date-scoped SHA-256 hashes for the current and previous Japan-time
day, while preserving only aggregate daily counts for older dates.
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
  revision when needed. Revision history keeps the latest 10 entries per article.
- Draft changes are saved only when an editor explicitly selects the draft save action.
- Duplicate an article as a new draft, or move an article to the trash and
  restore it later. Permanent deletion is only available inside the trash.
- Open `/admin/media` to upload reusable images and maintain alternative text.
  Images referenced by a current article or revision cannot be deleted.
- Open `/admin/analytics` to compare 7, 30, or 90 days of TOP page visits,
  daily unique browsers, newly created My Plans, plan image saves, plan shares,
  and article traffic, review popular articles, and export the aggregate data
  as CSV.
- Readers can combine text search and tag filters on `/articles`, move through
  paginated results, and discover related articles on each detail page.
- Readers can use an automatically generated table of contents, reading-time
  estimate, share/copy/print controls, RSS, and JSON Feed. These delivery
  features do not require an additional database migration.
- Editors see a real-time publication quality score for titles, search
  metadata, heading order, image alternative text, link URLs, internal link
  availability, cover images, and tags. Publication warns about remaining
  issues without interrupting draft saves.
- Open `/admin/series` to create an article series, then choose the series and
  reading order in the article editor. Published series have their own landing
  pages and previous/next article navigation.
- Open `/admin/backup` to download a complete JSON data backup or a CSV article
  catalog. Media metadata and URLs are included, but image binaries remain in
  Supabase Storage.
- Published articles appear under `/articles`; readers can filter them by tag.

## 6. Official update monitor

The old schedule-import Cron has been removed. Open
`/admin/official-updates`, save a Discord Incoming Webhook, select a time in
15-minute increments, and enable monitoring. The first run records a baseline
without sending a notification. Later source changes are grouped as official
news, Harmonyland schedules, and Fan Studio schedules, recorded as one update
history entry per monitor run, then sent to Discord as one summary. Detected
schedule changes are not
imported or published automatically; use the manual schedule import screen when
data needs to be updated.
Archived official source originals are retained for 45 days by default.

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
fetching the official site. Only changed originals are retained; the default
internal cap is 150MB and can be adjusted in the admin UI. The cap is calculated
from the entire private source-document bucket.

`vercel.json` still calls `/api/cron/publish-articles` once per day to publish due
articles. Cron endpoints require:

```text
Authorization: Bearer <CRON_SECRET>
```

## 7. Instagram comment-to-DM automation (not enabled by migration alone)

Review and apply `supabase/migrations/202609300001_instagram_dm_campaigns.sql` after a backup. It creates three service-role-only tables, a short-lease queue claim function, and a public PNG bucket. The image URL is accessible to anyone who has it; this is not a cryptographic follower-only download.

1. In Meta, configure an Instagram professional account and an app using Instagram Login. Request `instagram_business_basic`, `instagram_business_manage_comments`, and `instagram_business_manage_messages`; App Review or tester roles may be required before public use. Confirm the currently supported Graph API version in Meta's dashboard. Obtain the Instagram account ID, access token, app secret, and username. Arrange token renewal before expiry.
2. Add the server-only `INSTAGRAM_*` variables from `.env.example` to the deployment. Keep the token, app secret, webhook verify token, and worker secret out of browser code and source control.
3. Set the webhook callback to `https://<site>/api/instagram/webhook`, enter `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`, and subscribe the account to `comments`, `messages`, and `messaging_postbacks`. Confirm GET verification and signed POST deliveries using a test account.
4. Schedule the worker. Save the site URL and worker secret to Supabase Vault, then run the following SQL manually after replacing placeholders. If the site URL secret already exists for official monitoring, do not create it again.

```sql
select vault.create_secret('https://your-public-site.example', 'harmony_palette_site_url');
select vault.create_secret('replace-with-instagram-worker-secret', 'harmony_palette_instagram_dm_worker_secret');

select cron.schedule(
  'harmony-palette-instagram-dm',
  '* * * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'harmony_palette_site_url') || '/api/cron/instagram-dm',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'harmony_palette_instagram_dm_worker_secret')
    )
  );
  $$
);
```

5. Create and publish the target Reel. Resolve its **media ID** (not the Reel URL or shortcode) with the Instagram Graph API; cross-check the returned permalink. In `/admin/instagram`, create the monthly draft and use "自動DM用にセット" for each generated character ranking (or upload a saved PNG and paste its DM text). Review keywords and activate only after a test account completes the full flow.
6. In the admin status table, inspect `failed` and `needs_review`. Do not blindly retry `needs_review`: Meta may have accepted the send before a timeout. Pausing stops both new comments and pending sends. A same-user second comment is not the designed retry mechanism; the DM button is.

The worker claims up to three deliveries concurrently per pass and makes up to three passes per invocation. Each delivery completes one stage per pass; the next stage is claimed only after the previous stage is recorded. The webhook starts an immediate pass after persisting events, while the one-minute Cron is the durable fallback. Meta and Supabase rate limits still apply.

## 8. Read APIs

- Published schedules: `/api/schedules`
- Published attraction operations: `/api/operations?date=YYYY-MM-DD`

The operations API is ready for a future “today's operation status” section.
