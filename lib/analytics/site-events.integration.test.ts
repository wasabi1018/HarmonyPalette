import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { after, before, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
let configured = true;
mock.module("server-only", { defaultExport: {} });
mock.module(pathToFileURL(resolve(__dirname, "../supabase/server.ts")), {
  namedExports: {
    getSupabaseAdminClient: () => configured ? {
      async rpc(name: string, args: { site_event_name: string }) {
        assert.equal(name, "increment_site_analytics_event");
        const { rows } = await db.query<{ result: boolean }>(
          "select public.increment_site_analytics_event($1) as result",
          [args.site_event_name],
        );
        return { data: rows[0].result, error: null };
      },
    } : null,
  },
});

let route: typeof import("@/app/api/analytics/event/route");
before(async () => {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;");
  for (const file of [
    "202608030001_site_analytics.sql",
    "202608030002_site_analytics_plan_exports.sql",
    "20260929061751_daily_unique_visitors.sql",
  ]) {
    await db.exec(await readFile(resolve("supabase/migrations", file), "utf8"));
  }
  await db.exec("insert into public.site_daily_events(event_name,event_date,event_count) values ('home_view','2026-01-01',42),('unique_visitor','2026-01-01',7)");
  await db.exec(await readFile(resolve("supabase/migrations/20261019005948_site_analytics_crowd_forecast.sql"), "utf8"));
  await db.exec("set role service_role");
  route = await import("@/app/api/analytics/event/route");
});
after(async () => { await db.close(); });

function request(eventName: unknown, origin = "https://local.test") {
  return new Request("https://local.test/api/analytics/event", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify({ eventName }),
  });
}

test("migration preserves historical totals and the API records crowd forecast visits on the Japan-time date", async () => {
  const { rows: history } = await db.query<{ event_count: number }>(
    "select event_count::int from public.site_daily_events where event_name='home_view' and event_date='2026-01-01'",
  );
  assert.equal(history[0].event_count, 42);
  for (let visit = 0; visit < 2; visit++) {
    assert.equal((await route.POST(request("crowd_forecast_view"))).status, 204);
  }
  const { rows } = await db.query<{ count: number; japan_date: boolean }>(
    "select event_count::int as count, event_date = timezone('Asia/Tokyo',now())::date as japan_date from public.site_daily_events where event_name='crowd_forecast_view'",
  );
  assert.deepEqual(rows, [{ count: 2, japan_date: true }]);
});

test("all existing events and the deduplicated daily visitor RPC keep working", async () => {
  for (const eventName of ["home_view", "plan_created", "plan_image_saved", "plan_shared"]) {
    assert.equal((await route.POST(request(eventName))).status, 204);
  }
  const sql = "select public.record_daily_unique_visitor(timezone('Asia/Tokyo',now())::date,$1) as recorded";
  assert.equal((await db.query<{ recorded: boolean }>(sql, ["a".repeat(64)])).rows[0].recorded, true);
  assert.equal((await db.query<{ recorded: boolean }>(sql, ["a".repeat(64)])).rows[0].recorded, false);
  const { rows } = await db.query<{ count: number }>(
    "select event_count::int as count from public.site_daily_events where event_name='unique_visitor' and event_date=timezone('Asia/Tokyo',now())::date",
  );
  assert.equal(rows[0].count, 1);
});

test("invalid and cross-origin events cannot change the stored count", async () => {
  for (const value of ["unknown", "unique_visitor", "", null, 5]) {
    assert.equal((await route.POST(request(value))).status, 400);
  }
  assert.equal((await route.POST(request("crowd_forecast_view", "https://other.test"))).status, 403);
  for (const value of ["unknown", "unique_visitor", null]) {
    const { rows } = await db.query<{ result: boolean }>("select public.increment_site_analytics_event($1) as result", [value]);
    assert.equal(rows[0].result, false);
  }
  assert.equal((await db.query<{ count: number }>("select event_count::int as count from public.site_daily_events where event_name='crowd_forecast_view'")).rows[0].count, 2);
});

test("only the server role can call the counting function or write daily aggregates", async () => {
  try {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(db.query("select public.increment_site_analytics_event('crowd_forecast_view')"), /permission denied/);
      await assert.rejects(db.query("insert into public.site_daily_events(event_name,event_date) values('crowd_forecast_view',current_date)"), /permission denied/);
    }
  } finally {
    await db.exec("reset role; set role service_role");
  }
});

test("missing server configuration returns 503", async () => {
  configured = false;
  try {
    assert.equal((await route.POST(request("crowd_forecast_view"))).status, 503);
  } finally {
    configured = true;
  }
});
