import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;

export type ArticleBackupSummary = {
  articles: number;
  tags: number;
  series: number;
  revisions: number;
  media: number;
  mediaBytes: number;
};

const articleFields = [
  "id",
  "title",
  "slug",
  "excerpt",
  "seo_title",
  "seo_description",
  "content_json",
  "content_html",
  "cover_image_url",
  "status",
  "published_at",
  "deleted_at",
  "created_at",
  "updated_at",
  "series_id",
  "series_order",
] as const;

function requireAdminClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  return client;
}

function pick(row: Row, fields: readonly string[]) {
  return Object.fromEntries(
    fields.filter((field) => field in row).map((field) => [field, row[field]]),
  );
}

async function optionalRows(table: string, orderBy = "") {
  const client = requireAdminClient();
  let query = client.from(table).select("*");
  if (orderBy) query = query.order(orderBy, { ascending: true });
  const { data, error } = await query;
  if (error) return [] as Row[];
  return (data ?? []) as Row[];
}

export async function createArticleBackup() {
  const client = requireAdminClient();
  const [
    { data: articleData, error: articleError },
    { data: tagData, error: tagError },
    { data: relationData, error: relationError },
    revisions,
    media,
    series,
    analytics,
  ] = await Promise.all([
    client.from("articles").select("*").order("created_at", { ascending: true }),
    client.from("tags").select("id,name,slug,color,created_at,updated_at").order("created_at"),
    client.from("article_tags").select("article_id,tag_id,created_at").order("created_at"),
    optionalRows("article_revisions", "created_at"),
    optionalRows("article_media", "created_at"),
    optionalRows("article_series", "created_at"),
    optionalRows("article_daily_views", "view_date"),
  ]);
  if (articleError || tagError || relationError) {
    throw new Error(
      articleError?.message
      || tagError?.message
      || relationError?.message
      || "記事バックアップの作成に失敗しました。",
    );
  }

  const articles = ((articleData ?? []) as Row[]).map((row) => pick(row, articleFields));
  const tags = (tagData ?? []) as Row[];
  const articleTags = (relationData ?? []) as Row[];
  const generatedAt = new Date().toISOString();

  return {
    manifest: {
      format: "harmony-palette-article-backup",
      version: 1,
      generatedAt,
      includesMediaFiles: false,
      counts: {
        articles: articles.length,
        tags: tags.length,
        series: series.length,
        articleTags: articleTags.length,
        revisions: revisions.length,
        media: media.length,
        analytics: analytics.length,
      },
    },
    articles,
    tags,
    articleTags,
    series: series.map((row) => pick(row, [
      "id",
      "title",
      "slug",
      "description",
      "created_at",
      "updated_at",
    ])),
    revisions: revisions.map((row) => pick(row, [
      "id",
      "article_id",
      "revision_number",
      "snapshot",
      "created_at",
    ])),
    media: media.map((row) => pick(row, [
      "id",
      "storage_path",
      "public_url",
      "file_name",
      "mime_type",
      "size_bytes",
      "width",
      "height",
      "alt_text",
      "created_at",
      "updated_at",
    ])),
    analytics: analytics.map((row) => pick(row, [
      "article_id",
      "view_date",
      "view_count",
    ])),
  };
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export function createArticleCatalogCsv(
  backup: Awaited<ReturnType<typeof createArticleBackup>>,
) {
  const tagMap = new Map(backup.tags.map((tag) => [String(tag.id), String(tag.name)]));
  const articleTags = new Map<string, string[]>();
  backup.articleTags.forEach((relation) => {
    const articleId = String(relation.article_id);
    const name = tagMap.get(String(relation.tag_id));
    if (!name) return;
    articleTags.set(articleId, [...(articleTags.get(articleId) || []), name]);
  });
  const seriesMap = new Map(backup.series.map((item) => [String(item.id), String(item.title)]));
  const columns = [
    "id",
    "title",
    "slug",
    "status",
    "published_at",
    "updated_at",
    "series",
    "series_order",
    "tags",
    "excerpt",
    "cover_image_url",
    "deleted_at",
  ];
  const rows = backup.articles.map((article) => [
    article.id,
    article.title,
    article.slug,
    article.status,
    article.published_at,
    article.updated_at,
    seriesMap.get(String(article.series_id || "")) || "",
    article.series_order,
    (articleTags.get(String(article.id)) || []).join(" / "),
    article.excerpt,
    article.cover_image_url,
    article.deleted_at,
  ]);
  return `\uFEFF${[
    columns.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n")}`;
}

async function countRows(table: string) {
  const client = requireAdminClient();
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });
  return error ? 0 : count || 0;
}

export async function getArticleBackupSummary(): Promise<ArticleBackupSummary> {
  const client = requireAdminClient();
  const [articles, tags, series, revisions, media, mediaSizes] = await Promise.all([
    countRows("articles"),
    countRows("tags"),
    countRows("article_series"),
    countRows("article_revisions"),
    countRows("article_media"),
    client.from("article_media").select("size_bytes"),
  ]);
  return {
    articles,
    tags,
    series,
    revisions,
    media,
    mediaBytes: mediaSizes.error
      ? 0
      : (mediaSizes.data ?? []).reduce((total, item) => total + Number(item.size_bytes || 0), 0),
  };
}
