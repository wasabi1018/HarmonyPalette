# Harmony Palette Supabase setup

Supabase is the canonical store for approved schedules and attraction operation data. Source PDFs, popup images, and official API responses are archived in the private `official-source-documents` bucket.

## 1. Apply the database schema

Open the Supabase SQL Editor for the project and run:

- `supabase/migrations/202607220001_schedule_import.sql`
- `supabase/migrations/202607220002_character_display_order.sql`
- `supabase/migrations/202607270001_articles.sql`
- `supabase/migrations/202607280001_article_operations.sql`

This creates the import history, source documents, schedule versions, character
relations, attraction operation data, article and tag tables, public read
policies, the private source-document bucket, and the public `article-images`
bucket used by the article editor. The final migration adds scheduled
publication, SEO fields, and article revision history.

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
AUTO_PUBLISH_IMPORTS=false
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
- Published articles appear under `/articles`; readers can filter them by tag.

## 6. Scheduled import

`vercel.json` calls `/api/cron/import-schedules` daily at 21:00 UTC (06:00 JST). The route archives and saves candidates as drafts. With the recommended `AUTO_PUBLISH_IMPORTS=false`, an administrator must review and publish them.

It also calls `/api/cron/publish-articles` every 10 minutes to publish due
articles. For non-Vercel hosting, call the same routes from an external
scheduler with:

```text
Authorization: Bearer <CRON_SECRET>
```

## 7. Read APIs

- Published schedules: `/api/schedules`
- Published attraction operations: `/api/operations?date=YYYY-MM-DD`

The operations API is ready for a future “today's operation status” section.
