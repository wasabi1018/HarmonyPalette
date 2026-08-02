import "server-only";

import type {
  ArticleAnalyticsData,
  ArticleAnalyticsItem,
  SiteAnalyticsEvent,
} from "@/lib/articles/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function japanDate(value = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return japanDate(date);
}

export async function incrementArticleView(slug: string) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("閲覧数の集計が設定されていません。");
  const { data, error } = await client.rpc("increment_article_view", {
    article_slug: slug,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function incrementSiteAnalyticsEvent(eventName: SiteAnalyticsEvent) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("アクセス数の集計が設定されていません。");
  const { data, error } = await client.rpc("increment_site_analytics_event", {
    site_event_name: eventName,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

async function listViewRows(startDate: string) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("article_daily_views")
      .select("article_id,view_date,view_count")
      .gte("view_date", startDate)
      .order("view_date", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Row[]));
    if ((data?.length || 0) < 1000) break;
  }
  return rows;
}

async function listSiteEventRows(startDate: string) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("site_daily_events")
      .select("event_name,event_date,event_count")
      .gte("event_date", startDate)
      .order("event_date", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Row[]));
    if ((data?.length || 0) < 1000) break;
  }
  return rows;
}

export async function getArticleAnalytics(rangeDays: number): Promise<ArticleAnalyticsData> {
  const days = [7, 30, 90].includes(rangeDays) ? rangeDays : 30;
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  const startDate = dateDaysAgo(days - 1);
  const today = japanDate();
  const [{ data: articles, error: articlesError }, views, siteEvents] = await Promise.all([
    client
      .from("articles")
      .select("id,title,slug,cover_image_url")
      .is("deleted_at", null),
    listViewRows(startDate),
    listSiteEventRows(startDate),
  ]);
  if (articlesError) throw new Error(articlesError.message);

  const articleMap = new Map<string, ArticleAnalyticsItem>(
    (articles ?? []).map((article) => {
      const row = article as Row;
      const id = asText(row.id);
      return [id, {
        id,
        title: asText(row.title),
        slug: asText(row.slug),
        coverImageUrl: asText(row.cover_image_url),
        views: 0,
      }];
    }),
  );
  const dateTotals = new Map<string, number>();
  const homeVisitTotals = new Map<string, number>();
  const planCreationTotals = new Map<string, number>();
  const planImageSaveTotals = new Map<string, number>();
  const planShareTotals = new Map<string, number>();
  let totalViews = 0;
  let todayViews = 0;
  let homeVisits = 0;
  let todayHomeVisits = 0;
  let planCreations = 0;
  let todayPlanCreations = 0;
  let planImageSaves = 0;
  let todayPlanImageSaves = 0;
  let planShares = 0;
  let todayPlanShares = 0;

  views.forEach((row) => {
    const count = Number(row.view_count || 0);
    const date = asText(row.view_date);
    const article = articleMap.get(asText(row.article_id));
    if (article) article.views += count;
    dateTotals.set(date, (dateTotals.get(date) || 0) + count);
    totalViews += count;
    if (date === today) todayViews += count;
  });

  siteEvents.forEach((row) => {
    const count = Number(row.event_count || 0);
    const date = asText(row.event_date);
    const eventName = asText(row.event_name);
    if (eventName === "home_view") {
      homeVisitTotals.set(date, (homeVisitTotals.get(date) || 0) + count);
      homeVisits += count;
      if (date === today) todayHomeVisits += count;
    }
    if (eventName === "plan_created") {
      planCreationTotals.set(date, (planCreationTotals.get(date) || 0) + count);
      planCreations += count;
      if (date === today) todayPlanCreations += count;
    }
    if (eventName === "plan_image_saved") {
      planImageSaveTotals.set(date, (planImageSaveTotals.get(date) || 0) + count);
      planImageSaves += count;
      if (date === today) todayPlanImageSaves += count;
    }
    if (eventName === "plan_shared") {
      planShareTotals.set(date, (planShareTotals.get(date) || 0) + count);
      planShares += count;
      if (date === today) todayPlanShares += count;
    }
  });

  const daily = Array.from({ length: days }, (_, index) => {
    const date = dateDaysAgo(days - index - 1);
    return {
      date,
      views: dateTotals.get(date) || 0,
      homeVisits: homeVisitTotals.get(date) || 0,
      planCreations: planCreationTotals.get(date) || 0,
      planImageSaves: planImageSaveTotals.get(date) || 0,
      planShares: planShareTotals.get(date) || 0,
    };
  });
  const topArticles = Array.from(articleMap.values())
    .filter((article) => article.views > 0)
    .sort((left, right) => right.views - left.views)
    .slice(0, 10);

  return {
    rangeDays: days,
    totalViews,
    todayViews,
    averageViews: Math.round((totalViews / days) * 10) / 10,
    homeVisits,
    todayHomeVisits,
    planCreations,
    todayPlanCreations,
    planImageSaves,
    todayPlanImageSaves,
    planShares,
    todayPlanShares,
    daily,
    topArticles,
  };
}
