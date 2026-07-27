import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ArticleInput,
  ArticleRecord,
  ArticleStatus,
  ArticleSummary,
  ArticleTag,
} from "@/lib/articles/types";
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
  const status: ArticleStatus = row.status === "published" ? "published" : "draft";
  return {
    id: asText(row.id),
    title: asText(row.title),
    slug: asText(row.slug),
    excerpt: asText(row.excerpt),
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
  return getAdminArticle(id);
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
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }
  return data ? mapRecord(data as Row) : null;
}
