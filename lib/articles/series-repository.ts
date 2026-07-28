import "server-only";

import type {
  ArticleSeries,
  ArticleSeriesAssignment,
  ArticleSummary,
} from "@/lib/articles/types";
import { listPublishedArticles } from "@/lib/articles/repository";
import {
  getSupabaseAdminClient,
  getSupabaseReadClient,
} from "@/lib/supabase/server";

type Row = Record<string, unknown>;

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function mapSeries(row: Row): ArticleSeries {
  return {
    id: asText(row.id),
    title: asText(row.title),
    slug: asText(row.slug),
    description: asText(row.description),
    createdAt: asText(row.created_at),
    updatedAt: asText(row.updated_at),
  };
}

function requireAdminClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  return client;
}

export async function listArticleSeries() {
  const client = requireAdminClient();
  const [
    { data: series, error: seriesError },
    { data: articles, error: articlesError },
  ] = await Promise.all([
    client.from("article_series").select("*").order("title"),
    client.from("articles").select("series_id").is("deleted_at", null).not("series_id", "is", null),
  ]);
  if (seriesError || articlesError) {
    throw new Error(seriesError?.message || articlesError?.message || "シリーズの取得に失敗しました。");
  }
  const counts = new Map<string, number>();
  (articles ?? []).forEach((item) => {
    const id = asText((item as Row).series_id);
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  });
  return (series ?? []).map((item) => {
    const value = mapSeries(item as Row);
    return { ...value, articleCount: counts.get(value.id) || 0 };
  });
}

export async function createArticleSeries(input: {
  title: string;
  slug: string;
  description: string;
}) {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("article_series")
    .insert(input)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapSeries(data as Row);
}

export async function updateArticleSeries(
  id: string,
  input: { title: string; slug: string; description: string },
) {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("article_series")
    .update(input)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapSeries(data as Row) : null;
}

export async function deleteArticleSeries(id: string) {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("article_series")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function getAdminArticleSeriesAssignment(
  articleId: string,
): Promise<ArticleSeriesAssignment> {
  const client = requireAdminClient();
  const { data, error } = await client
    .from("articles")
    .select("series_id,series_order")
    .eq("id", articleId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    seriesId: data?.series_id ? asText(data.series_id) : null,
    seriesOrder: data?.series_order ? Number(data.series_order) : null,
  };
}

async function orderedPublishedSeriesArticles(seriesId: string) {
  const client = getSupabaseReadClient();
  if (!client) return [];
  const { data, error } = await client
    .from("articles")
    .select("id,series_order,published_at")
    .eq("series_id", seriesId)
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .order("series_order", { ascending: true, nullsFirst: false })
    .order("published_at", { ascending: true });
  if (error) throw new Error(error.message);
  const order = (data ?? []).map((item) => ({
    id: asText((item as Row).id),
    seriesOrder: Number((item as Row).series_order || 0),
  }));
  const articles = await listPublishedArticles();
  const articleMap = new Map(articles.map((article) => [article.id, article]));
  return order
    .map((item) => {
      const article = articleMap.get(item.id);
      return article ? { article, seriesOrder: item.seriesOrder } : null;
    })
    .filter((item): item is { article: ArticleSummary; seriesOrder: number } => Boolean(item));
}

export async function getPublishedArticleSeriesContext(articleId: string) {
  const client = getSupabaseReadClient();
  if (!client) return null;
  const { data: assignment, error: assignmentError } = await client
    .from("articles")
    .select("series_id,series_order")
    .eq("id", articleId)
    .eq("status", "published")
    .maybeSingle();
  if (assignmentError) throw new Error(assignmentError.message);
  const seriesId = assignment?.series_id ? asText(assignment.series_id) : "";
  if (!seriesId) return null;
  const { data: seriesData, error: seriesError } = await client
    .from("article_series")
    .select("*")
    .eq("id", seriesId)
    .maybeSingle();
  if (seriesError) throw new Error(seriesError.message);
  if (!seriesData) return null;
  const articles = await orderedPublishedSeriesArticles(seriesId);
  const currentIndex = articles.findIndex((item) => item.article.id === articleId);
  return {
    series: mapSeries(seriesData as Row),
    seriesOrder: Number(assignment?.series_order || 0),
    articles,
    previous: currentIndex > 0 ? articles[currentIndex - 1] : null,
    next: currentIndex >= 0 && currentIndex < articles.length - 1
      ? articles[currentIndex + 1]
      : null,
  };
}

export async function getPublishedArticleSeries(slug: string) {
  const client = getSupabaseReadClient();
  if (!client) return null;
  const { data, error } = await client
    .from("article_series")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const series = mapSeries(data as Row);
  const articles = await orderedPublishedSeriesArticles(series.id);
  return articles.length ? { series, articles } : null;
}

export async function listPublishedArticleSeries() {
  const client = getSupabaseReadClient();
  if (!client) return [];
  const { data: assignments, error: assignmentError } = await client
    .from("articles")
    .select("series_id")
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .not("series_id", "is", null);
  if (assignmentError) throw new Error(assignmentError.message);
  const seriesIds = Array.from(new Set(
    (assignments ?? []).map((item) => asText((item as Row).series_id)).filter(Boolean),
  ));
  if (!seriesIds.length) return [];
  const { data, error } = await client
    .from("article_series")
    .select("*")
    .in("id", seriesIds)
    .order("title");
  if (error) throw new Error(error.message);
  const counts = new Map<string, number>();
  (assignments ?? []).forEach((item) => {
    const id = asText((item as Row).series_id);
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  });
  return (data ?? []).map((item) => {
    const series = mapSeries(item as Row);
    return { ...series, articleCount: counts.get(series.id) || 0 };
  });
}
