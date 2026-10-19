import "server-only";

import type {
  ArticleAnalyticsData,
  ArticleAnalyticsItem,
  ArticleAnalyticsTotals,
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

function dateDaysAgo(days: number, now: Date) {
  const date = new Date(now);
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

export async function recordDailyUniqueVisitor(visitDate: string, visitorHash: string) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("アクセス数の集計が設定されていません。");
  const { data, error } = await client.rpc("record_daily_unique_visitor", {
    visitor_date_arg: visitDate,
    visitor_hash_arg: visitorHash,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

async function listViewRows(today: string) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("article_daily_views")
      .select("article_id,view_date,view_count")
      .lte("view_date", today)
      .order("view_date", { ascending: true })
      .order("article_id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Row[]));
    if ((data?.length || 0) < 1000) break;
  }
  return rows;
}

async function listSiteEventRows(today: string) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabaseのサーバー用秘密鍵が設定されていません。");
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("site_daily_events")
      .select("event_name,event_date,event_count")
      .lte("event_date", today)
      .order("event_date", { ascending: true })
      .order("event_name", { ascending: true })
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
  const now = new Date();
  const startDate = dateDaysAgo(days - 1, now);
  const today = japanDate(now);
  const [{ data: articles, error: articlesError }, views, siteEvents] = await Promise.all([
    client
      .from("articles")
      .select("id,title,slug,cover_image_url")
      .is("deleted_at", null),
    listViewRows(today),
    listSiteEventRows(today),
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
        cumulativeViews: 0,
      }];
    }),
  );
  const cumulative: ArticleAnalyticsTotals = {
    uniqueVisitors: 0,
    views: 0,
    homeVisits: 0,
    crowdForecastVisits: 0,
    planCreations: 0,
    planImageSaves: 0,
    planShares: 0,
  };
  const dateTotals = new Map<string, number>();
  const uniqueVisitorTotals = new Map<string, number>();
  const homeVisitTotals = new Map<string, number>();
  const crowdForecastVisitTotals = new Map<string, number>();
  const planCreationTotals = new Map<string, number>();
  const planImageSaveTotals = new Map<string, number>();
  const planShareTotals = new Map<string, number>();
  let totalViews = 0;
  let todayViews = 0;
  let homeVisits = 0;
  let todayHomeVisits = 0;
  let crowdForecastVisits = 0;
  let todayCrowdForecastVisits = 0;
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
    cumulative.views += count;
    if (article) article.cumulativeViews += count;
    if (date < startDate) return;
    if (article) article.views += count;
    dateTotals.set(date, (dateTotals.get(date) || 0) + count);
    totalViews += count;
    if (date === today) todayViews += count;
  });

  siteEvents.forEach((row) => {
    const count = Number(row.event_count || 0);
    const date = asText(row.event_date);
    const eventName = asText(row.event_name);
    if (eventName === "unique_visitor") cumulative.uniqueVisitors += count;
    if (eventName === "home_view") cumulative.homeVisits += count;
    if (eventName === "crowd_forecast_view") cumulative.crowdForecastVisits += count;
    if (eventName === "plan_created") cumulative.planCreations += count;
    if (eventName === "plan_image_saved") cumulative.planImageSaves += count;
    if (eventName === "plan_shared") cumulative.planShares += count;
    if (date < startDate) return;
    if (eventName === "unique_visitor") {
      uniqueVisitorTotals.set(date, (uniqueVisitorTotals.get(date) || 0) + count);
    }
    if (eventName === "home_view") {
      homeVisitTotals.set(date, (homeVisitTotals.get(date) || 0) + count);
      homeVisits += count;
      if (date === today) todayHomeVisits += count;
    }
    if (eventName === "crowd_forecast_view") {
      crowdForecastVisitTotals.set(date, (crowdForecastVisitTotals.get(date) || 0) + count);
      crowdForecastVisits += count;
      if (date === today) todayCrowdForecastVisits += count;
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
    const date = dateDaysAgo(days - index - 1, now);
    return {
      date,
      uniqueVisitors: uniqueVisitorTotals.get(date) || 0,
      views: dateTotals.get(date) || 0,
      homeVisits: homeVisitTotals.get(date) || 0,
      crowdForecastVisits: crowdForecastVisitTotals.get(date) || 0,
      planCreations: planCreationTotals.get(date) || 0,
      planImageSaves: planImageSaveTotals.get(date) || 0,
      planShares: planShareTotals.get(date) || 0,
    };
  });
  const topArticles = Array.from(articleMap.values())
    .filter((article) => article.views > 0)
    .sort((left, right) => right.views - left.views)
    .slice(0, 10);
  const totalDailyUniqueVisitors = daily.reduce(
    (total, point) => total + point.uniqueVisitors,
    0,
  );

  return {
    rangeDays: days,
    cumulative,
    totalDailyUniqueVisitors,
    todayUniqueVisitors: uniqueVisitorTotals.get(today) || 0,
    averageDailyUniqueVisitors: Math.round((totalDailyUniqueVisitors / days) * 10) / 10,
    peakDailyUniqueVisitors: Math.max(...daily.map((point) => point.uniqueVisitors), 0),
    totalViews,
    todayViews,
    averageViews: Math.round((totalViews / days) * 10) / 10,
    homeVisits,
    todayHomeVisits,
    crowdForecastVisits,
    todayCrowdForecastVisits,
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
