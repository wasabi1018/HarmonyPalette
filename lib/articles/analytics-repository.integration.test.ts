import assert from "node:assert/strict";
import { before, beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};
const pages: { table: string; offset: number; order: string[] }[] = [];
let configured = true;
let failedTable = "";
const client = {
  from(table: string) {
    let upperDate = "";
    let dateColumn = "";
    const order: string[] = [];
    return {
      select() { return this; },
      async is(column: string, value: null) {
        assert.equal(column, "deleted_at");
        assert.equal(value, null);
        return { data: tables[table].filter((row) => row.deleted_at == null), error: null };
      },
      lte(column: string, value: string) {
        dateColumn = column;
        upperDate = value;
        return this;
      },
      order(column: string, options: { ascending: boolean }) {
        assert.equal(options.ascending, true);
        order.push(column);
        return this;
      },
      async range(offset: number, end: number) {
        assert.equal(upperDate, "2026-10-14");
        assert.equal(end, offset + 999);
        pages.push({ table, offset, order });
        if (failedTable === table) return { data: null, error: { message: "read failed" } };
        const rows = tables[table]
          .filter((row) => String(row[dateColumn]) <= upperDate)
          .sort((left, right) => {
            for (const column of order) {
              const result = String(left[column]).localeCompare(String(right[column]));
              if (result) return result;
            }
            return 0;
          });
        return { data: rows.slice(offset, end + 1), error: null };
      },
    };
  },
};

mock.module("server-only", { defaultExport: {} });
mock.module(pathToFileURL(resolve(__dirname, "../supabase/server.ts")), {
  namedExports: { getSupabaseAdminClient: () => configured ? client : null },
});
let repository: typeof import("./analytics-repository");
before(async () => {
  repository = await import(pathToFileURL(resolve(__dirname, "analytics-repository.ts")).href);
});
beforeEach((context) => {
  // UTC is still October 13; the dashboard must include October 14 in Japan.
  if ("mock" in context) context.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-13T15:30:00Z") });
  configured = true;
  failedTable = "";
  pages.length = 0;
  tables.articles = [
    { id: "a", title: "記事A", slug: "a", cover_image_url: "", deleted_at: null },
    { id: "b", title: "記事B", slug: "b", cover_image_url: "", deleted_at: null },
    { id: "deleted", title: "削除済み", slug: "deleted", deleted_at: "2026-10-10" },
  ];
  tables.article_daily_views = [
    { article_id: "a", view_date: "2026-07-01", view_count: 100 },
    { article_id: "a", view_date: "2026-10-07", view_count: 20 },
    { article_id: "a", view_date: "2026-10-08", view_count: 3 },
    { article_id: "a", view_date: "2026-10-14", view_count: 4 },
    { article_id: "b", view_date: "2026-10-14", view_count: 10 },
    { article_id: "deleted", view_date: "2026-10-14", view_count: 2 },
    { article_id: "a", view_date: "2026-10-15", view_count: 999 },
  ];
  tables.site_daily_events = ["unique_visitor", "home_view", "crowd_forecast_view", "plan_created", "plan_image_saved", "plan_shared"]
    .flatMap((event_name) => [
      { event_name, event_date: "2026-07-01", event_count: 100 },
      { event_name, event_date: "2026-10-07", event_count: 20 },
      { event_name, event_date: "2026-10-08", event_count: 3 },
      { event_name, event_date: "2026-10-14", event_count: 4 },
      { event_name, event_date: "2026-10-15", event_count: 999 },
    ]);
});

test("all seven cumulative totals stay unchanged across periods while daily totals and rankings use the selected period", async () => {
  for (const days of [7, 30, 90]) {
    const data = await repository.getArticleAnalytics(days);
    const eventTotal = days === 7 ? 7 : 27;
    assert.deepEqual(data.cumulative, {
      uniqueVisitors: 127, views: 139, homeVisits: 127, crowdForecastVisits: 127,
      planCreations: 127, planImageSaves: 127, planShares: 127,
    });
    assert.equal(data.daily.length, days);
    assert.equal(data.daily.at(-1)?.date, "2026-10-14");
    assert.equal(data.totalDailyUniqueVisitors, eventTotal);
    assert.equal(data.homeVisits, eventTotal);
    assert.equal(data.crowdForecastVisits, eventTotal);
    assert.equal(data.planCreations, eventTotal);
    assert.equal(data.planImageSaves, eventTotal);
    assert.equal(data.planShares, eventTotal);
    assert.equal(data.totalViews, eventTotal + 12);
    assert.equal(data.todayUniqueVisitors, 4);
    assert.equal(data.todayViews, 16);
    assert.equal(data.todayHomeVisits, 4);
    assert.equal(data.todayCrowdForecastVisits, 4);
    assert.equal(data.todayPlanCreations, 4);
    assert.equal(data.todayPlanImageSaves, 4);
    assert.equal(data.todayPlanShares, 4);
    assert.equal(data.daily.reduce((sum, point) => sum + point.views, 0), data.totalViews);
    assert.equal(data.daily.reduce((sum, point) => sum + point.uniqueVisitors, 0), eventTotal);
    assert.equal(data.daily.reduce((sum, point) => sum + point.crowdForecastVisits, 0), eventTotal);
    assert.equal(data.averageDailyUniqueVisitors, Math.round(eventTotal / days * 10) / 10);
    assert.equal(data.topArticles[0].id, days === 7 ? "b" : "a");
    assert.equal(data.topArticles.find((article) => article.id === "a")?.cumulativeViews, 127);
    assert.ok(data.topArticles.every((article) => article.id !== "deleted"));
  }
});

test("cumulative totals include history beyond 90 days and every page beyond the 1000-row API limit", async () => {
  tables.article_daily_views = Array.from({ length: 1005 }, (_, index) => ({
    article_id: `historical-${index}`, view_date: "2026-07-01", view_count: 2,
  }));
  tables.site_daily_events = Array.from({ length: 1005 }, (_, index) => ({
    event_name: "home_view", event_date: new Date(Date.UTC(2020, 0, index + 1)).toISOString().slice(0, 10), event_count: 3,
  }));
  const data = await repository.getArticleAnalytics(7);
  assert.equal(data.cumulative.views, 2010);
  assert.equal(data.cumulative.homeVisits, 3015);
  assert.equal(data.totalViews, 0);
  assert.equal(data.homeVisits, 0);
  assert.deepEqual(pages.filter((page) => page.table === "article_daily_views").map((page) => page.offset), [0, 1000]);
  assert.deepEqual(pages.filter((page) => page.table === "site_daily_events").map((page) => page.offset), [0, 1000]);
  assert.deepEqual(pages[0].order, ["view_date", "article_id"]);
  assert.deepEqual(pages[1].order, ["event_date", "event_name"]);
});

test("empty data returns zero cumulative totals and invalid periods fall back to 30 days", async () => {
  tables.article_daily_views = [];
  tables.site_daily_events = [];
  const data = await repository.getArticleAnalytics(365);
  assert.equal(data.rangeDays, 30);
  assert.deepEqual(Object.values(data.cumulative), [0, 0, 0, 0, 0, 0, 0]);
  assert.equal(data.daily.length, 30);
  assert.deepEqual(data.topArticles, []);
});

test("crowd forecast visits stay separate from TOP visits and return zero before tracking starts", async () => {
  tables.site_daily_events = tables.site_daily_events.filter((row) => row.event_name !== "crowd_forecast_view");
  const beforeTracking = await repository.getArticleAnalytics(7);
  assert.equal(beforeTracking.crowdForecastVisits, 0);
  assert.equal(beforeTracking.todayCrowdForecastVisits, 0);
  assert.equal(beforeTracking.cumulative.crowdForecastVisits, 0);
  assert.ok(beforeTracking.daily.every((point) => point.crowdForecastVisits === 0));
  tables.site_daily_events.push(
    { event_name: "crowd_forecast_view", event_date: "2026-07-01", event_count: 50 },
    { event_name: "crowd_forecast_view", event_date: "2026-10-08", event_count: 8 },
    { event_name: "crowd_forecast_view", event_date: "2026-10-14", event_count: 9 },
  );
  const data = await repository.getArticleAnalytics(7);
  assert.equal(data.crowdForecastVisits, 17);
  assert.equal(data.todayCrowdForecastVisits, 9);
  assert.equal(data.cumulative.crowdForecastVisits, 67);
  assert.equal(data.homeVisits, beforeTracking.homeVisits);
  assert.equal(data.cumulative.homeVisits, beforeTracking.cumulative.homeVisits);
  assert.equal(data.totalDailyUniqueVisitors, beforeTracking.totalDailyUniqueVisitors);
});

test("failed cumulative reads surface an error rather than silently displaying incomplete totals", async () => {
  failedTable = "site_daily_events";
  await assert.rejects(() => repository.getArticleAnalytics(7), /read failed/);
  configured = false;
  await assert.rejects(() => repository.getArticleAnalytics(7), /秘密鍵/);
});
