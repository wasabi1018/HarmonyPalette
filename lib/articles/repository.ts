import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ArticleInput,
  ArticleRecord,
  ArticleRevision,
  ArticleStatus,
  ArticleSummary,
  ArticleTag,
} from "@/lib/articles/types";
import { parseArticleInput } from "@/lib/articles/validation";
import {
  getSupabaseAdminClient,
  getSupabaseReadClient,
} from "@/lib/supabase/server";

type Row = Record<string, unknown>;

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function mapTag(row: Row): ArticleTag {
  return {
    id: asText(row.id),
    name: asText(row.name),
    slug: asText(row.slug),
    color: asText(row.color) || "#eb6e98",
  };
}

function extractTags(row: Row) {
  const relations = Array.isArray(row.article_tags) ? row.article_tags : [];
  return relations
    .map((relation) => {
      if (!relation || typeof relation !== "object" || Array.isArray(relation)) return null;
      const tag = (relation as Row).tag;
      if (!tag || typeof tag !== "object" || Array.isArray(tag)) return null;
      return mapTag(tag as Row);
    })
    .filter((tag): tag is ArticleTag => Boolean(tag?.id));
}

function mapSummary(row: Row): ArticleSummary {
  const status: ArticleStatus = row.status === "published"
    ? "published"
    : row.status === "scheduled"
      ? "scheduled"
      : "draft";
  return {
    id: asText(row.id),
    title: asText(row.title),
    slug: asText(row.slug),
    excerpt: asText(row.excerpt),
    seoTitle: asText(row.seo_title),
    seoDescription: asText(row.seo_description),
    coverImageUrl: asText(row.cover_image_url),
    status,
    publishedAt: row.published_at ? asText(row.published_at) : null,
    createdAt: asText(row.created_at),
    updatedAt: asText(row.updated_at),
    tags: extractTags(row),
  };
}

function mapRecord(row: Row): ArticleRecord {
  const summary = mapSummary(row);
  const contentJson = row.content_json;
  return {
    ...summary,
    contentJson: contentJson && typeof contentJson === "object" && !Array.isArray(contentJson)
      ? contentJson as Record<string, unknown>
      : { type: "doc", content: [{ type: "paragraph" }] },
    contentHtml: asText(row.content_html) || "<p></p>",
  };
}

const articleSelection = `
  id,
  title,
  slug,
  excerpt,
  seo_title,
  seo_description,
  content_json,
  content_html,
  cover_image_url,
  status,
  published_at,
  created_at,
  updated_at,
  article_tags (
    tag:tags (
      id,
      name,
      slug,
      color
    )
  )
`;

function requireAdminClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  return client;
}

async function replaceArticleTags(
  client: SupabaseClient,
  articleId: string,
  tagIds: string[],
) {
  const { error: deleteError } = await client
    .from("article_tags")
    .delete()
    .eq("article_id", articleId);
  if (deleteError) throw new Error(deleteError.message);

  if (tagIds.length > 0) {
    const { error: insertError } = await client.from("article_tags").insert(
      tagIds.map((tagId) => ({ article_id: articleId, tag_id: tagId })),
    );
    if (insertError) throw new Error(insertError.message);
  }
}

async function createArticleRevision(
  client: SupabaseClient,
  articleId: string,
  userId: string | null,
) {
  const [{ data: article, error: articleError }, { data: relations, error: relationsError }, { data: latest, error: latestError }] = await Promise.all([
    client.from("articles").select(articleSelection).eq("id", articleId).single(),
    client.from("article_tags").select("tag_id").eq("article_id", articleId),
    client
      .from("article_revisions")
      .select("revision_number")
      .eq("article_id", articleId)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (articleError || relationsError || latestError) {
    throw new Error(
      articleError?.message
      || relationsError?.message
      || latestError?.message
      || "変更履歴の作成に失敗しました。",
    );
  }

  const record = mapRecord(article as Row);
  const snapshot: ArticleInput = {
    title: record.title,
    slug: record.slug,
    excerpt: record.excerpt,
    seoTitle: record.seoTitle,
    seoDescription: record.seoDescription,
    contentJson: record.contentJson,
    contentHtml: record.contentHtml,
    coverImageUrl: record.coverImageUrl,
    status: record.status,
    publishedAt: record.publishedAt,
    tagIds: (relations ?? []).map((relation) => asText((relation as Row).tag_id)).filter(Boolean),
  };
  const revisionNumber = Number((latest as Row | null)?.revision_number || 0) + 1;
  const { error } = await client.from("article_revisions").insert({
    article_id: articleId,
    revision_number: revisionNumber,
    snapshot,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
}

export async function listAdminArticles() {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("articles")
    .select(articleSelection)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapSummary(row as Row));
}

export async function getAdminArticle(id: string) {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("articles")
    .select(articleSelection)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRecord(data as Row) : null;
}

export async function listTags() {
  const client = requireAdminClient();
  const [{ data: tags, error: tagsError }, { data: relations, error: relationsError }] = await Promise.all([
    client.from("tags").select("id,name,slug,color,created_at,updated_at").order("name"),
    client.from("article_tags").select("tag_id"),
  ]);
  if (tagsError || relationsError) {
    throw new Error(tagsError?.message || relationsError?.message || "タグの取得に失敗しました。");
  }
  const counts = new Map<string, number>();
  (relations ?? []).forEach((relation) => {
    const tagId = asText((relation as Row).tag_id);
    counts.set(tagId, (counts.get(tagId) || 0) + 1);
  });
  return (tags ?? []).map((row) => {
    const tag = mapTag(row as Row);
    return { ...tag, articleCount: counts.get(tag.id) || 0 };
  });
}

export async function createArticle(input: ArticleInput, userId: string | null) {
  const client = requireAdminClient();
  const { tagIds, ...article } = input;
  const { data, error } = await client
    .from("articles")
    .insert({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      seo_title: article.seoTitle,
      seo_description: article.seoDescription,
      content_json: article.contentJson,
      content_html: article.contentHtml,
      cover_image_url: article.coverImageUrl,
      status: article.status,
      published_at: article.publishedAt,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const id = asText((data as Row).id);
  await replaceArticleTags(client, id, tagIds);
  await createArticleRevision(client, id, userId);
  return getAdminArticle(id);
}

export async function updateArticle(
  id: string,
  input: ArticleInput,
  userId: string | null,
) {
  const client = requireAdminClient();
  const { tagIds, ...article } = input;
  const { data, error } = await client
    .from("articles")
    .update({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      seo_title: article.seoTitle,
      seo_description: article.seoDescription,
      content_json: article.contentJson,
      content_html: article.contentHtml,
      cover_image_url: article.coverImageUrl,
      status: article.status,
      published_at: article.publishedAt,
      updated_by: userId,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  await replaceArticleTags(client, id, tagIds);
  await createArticleRevision(client, id, userId);
  return getAdminArticle(id);
}

export async function listArticleRevisions(articleId: string): Promise<ArticleRevision[]> {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("article_revisions")
    .select("id,article_id,revision_number,snapshot,created_at")
    .eq("article_id", articleId)
    .order("revision_number", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => {
    const row = item as Row;
    const snapshot = row.snapshot && typeof row.snapshot === "object" && !Array.isArray(row.snapshot)
      ? row.snapshot as Row
      : {};
    const snapshotStatus: ArticleStatus = snapshot.status === "published"
      ? "published"
      : snapshot.status === "scheduled"
        ? "scheduled"
        : "draft";
    return {
      id: asText(row.id),
      articleId: asText(row.article_id),
      revisionNumber: Number(row.revision_number || 0),
      title: asText(snapshot.title),
      status: snapshotStatus,
      createdAt: asText(row.created_at),
    };
  });
}

export async function restoreArticleRevision(
  articleId: string,
  revisionId: string,
  userId: string | null,
) {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("article_revisions")
    .select("snapshot")
    .eq("id", revisionId)
    .eq("article_id", articleId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const snapshot = data.snapshot && typeof data.snapshot === "object" && !Array.isArray(data.snapshot)
    ? data.snapshot as Row
    : {};
  return updateArticle(
    articleId,
    parseArticleInput({ ...snapshot, status: "draft", publishedAt: null }),
    userId,
  );
}

export async function publishDueArticles(now = new Date()) {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("articles")
    .update({ status: "published" })
    .eq("status", "scheduled")
    .lte("published_at", now.toISOString())
    .select("id");
  if (error) throw new Error(error.message);
  const articleIds = (data ?? []).map((row) => asText((row as Row).id));
  await Promise.all(articleIds.map((articleId) => createArticleRevision(client, articleId, null)));
  return { publishedCount: articleIds.length, articleIds };
}

export async function deleteArticle(id: string) {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("articles")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function createTag(input: { name: string; slug: string; color: string }) {
  const client = requireAdminClient();
  const { data, error } = await client.from("tags").insert(input).select("*").single();
  if (error) throw new Error(error.message);
  return mapTag(data as Row);
}

export async function updateTag(
  id: string,
  input: { name: string; slug: string; color: string },
) {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("tags")
    .update(input)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapTag(data as Row) : null;
}

export async function deleteTag(id: string) {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("tags")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function listPublishedArticles(tagSlug?: string) {
  const client = getSupabaseReadClient();
  if (!client) return [];

  const query = client
    .from("articles")
    .select(articleSelection)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });
  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }
  const articles = (data ?? []).map((row) => mapSummary(row as Row));
  return tagSlug
    ? articles.filter((article) => article.tags.some((tag) => tag.slug === tagSlug))
    : articles;
}

export async function getPublishedArticle(slug: string) {
  const client = getSupabaseReadClient();
  if (!client) return null;
  const { data, error } = await client
    .from("articles")
    .select(articleSelection)
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }
  return data ? mapRecord(data as Row) : null;
}
