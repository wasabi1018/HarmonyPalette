import assert from "node:assert/strict";
import { before, beforeEach, after, mock, test } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { addDays, japanDay } from "./date";
import { calculate, DEFAULT_CONFIG, emptyState } from "./model";
import type { DayInput, Weather } from "./types";

const db = new PGlite();
const today = japanDay(),
  tomorrow = addDays(today, 1);
let authorized = false,
  external = 0,
  reads = 0;
const client = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => {
          reads++;
          const r = await db.query(
            "select * from public.crowd_forecast_state where id='main'",
          );
          return { data: r.rows[0], error: null };
        },
      }),
    }),
  }),
  rpc: async (name: string, args: Record<string, unknown>) => {
    const sql =
      name === "crowd_forecast_claim"
        ? "select * from public.crowd_forecast_claim($1::date,$2::uuid)"
        : "select * from public.crowd_forecast_write($1::bigint,$2::jsonb,$3::uuid)";
    const values =
      name === "crowd_forecast_claim"
        ? [args.p_day, args.p_token]
        : [args.p_revision, JSON.stringify(args.p_payload), args.p_token];
    return {
      data: (await db.query<{ revision: number }>(sql, values)).rows,
      error: null,
    };
  },
};
const moduleUrl = (p: string) => pathToFileURL(resolve(__dirname, p));
mock.module("server-only", { defaultExport: {} });
mock.module(moduleUrl("../supabase/server.ts"), {
  namedExports: {
    getSupabaseAdminClient: () => client,
    assertImportAuthorization: async () =>
      authorized
        ? { ok: true }
        : {
            ok: false,
            status: 401,
            message: "管理者としてログインしてください。",
          },
  },
});
mock.module(moduleUrl("../supabase/character-repository.ts"), {
  namedExports: {
    getRegisteredCharacters: async () => [
      { id: "kuromi", name: "クロミ", birthdayMonth: 10, birthdayDay: 31 },
    ],
  },
});
mock.module(moduleUrl("../supabase/schedule-repository.ts"), {
  namedExports: {
    getPublishedParkOperatingDays: async () =>
      [today, tomorrow].map((date) => ({
        operation_date: date,
        operating_status: "open",
        opening_time: "10:00:00",
        closing_time: "20:00:00",
      })),
    getPublishedSchedules: async () => [
      {
        id: "event",
        kind: "event",
        event_date: tomorrow,
        end_date: tomorrow,
        verification_status: "verified",
        source_id: "official",
        schedule_type: "show",
        location: "stage",
        start_time: "12:00",
      },
      ...Array.from({ length: 24 }, (_, i) => ({
        id: `fan${i}`,
        kind: "greeting",
        event_date: tomorrow,
        end_date: null,
        verification_status: "verified",
        source_id: "harmonyland-funstudio",
        schedule_type: "ファンスタジオ",
        location: `${101 + (i % 3)}号室`,
        start_time: `${10 + Math.floor(i / 3)}:00`,
      })),
      // Multiple characters in the same room and time must not inflate slot counts.
      {
        id: "duplicate",
        kind: "greeting",
        event_date: tomorrow,
        end_date: null,
        verification_status: "verified",
        source_id: "harmonyland-funstudio",
        schedule_type: "ファンスタジオ",
        location: "１０１号室",
        start_time: "10:00",
      },
    ],
  },
});
let repository: typeof import("./repository"),
  publicRoute: typeof import("@/app/api/crowd-forecast/route"),
  adminRoute: typeof import("@/app/api/admin/crowd-forecast/route"),
  cron: typeof import("@/app/api/cron/crowd-forecast/route");
before(async () => {
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;",
  );
  await db.exec(
    readFileSync(
      resolve(
        __dirname,
        "../../supabase/migrations/20261018043350_crowd_forecast.sql",
      ),
      "utf8",
    ),
  );
  repository = await import("./repository");
  publicRoute = await import("@/app/api/crowd-forecast/route");
  adminRoute = await import("@/app/api/admin/crowd-forecast/route");
  cron = await import("@/app/api/cron/crowd-forecast/route");
});
beforeEach(async () => {
  await db.exec(
    "reset role;update public.crowd_forecast_state set payload='{}',revision=0,lease_token=null,lease_until=null,last_attempt_day=null;set role service_role;",
  );
  authorized = false;
  external = 0;
  reads = 0;
});
after(async () => {
  await db.close();
});
const request = (body: object, origin = "https://local.test") =>
  new Request("https://local.test/api/admin/crowd-forecast", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("公開GETは保存済みデータだけを読み、取得・計算・DB書き込みを行わない", async () => {
  const restore = mock.method(globalThis, "fetch", async () => {
    external++;
    throw new Error("Unexpected network");
  });
  const response = await publicRoute.GET(
    new Request("https://local.test/api/crowd-forecast"),
  );
  assert.equal(response.status, 200);
  assert.equal(external, 0);
  assert.equal(reads, 1);
  assert.equal(
    (
      await db.query<{ revision: number }>(
        "select revision from public.crowd_forecast_state",
      )
    ).rows[0].revision,
    0,
  );
  assert.doesNotMatch(
    await response.text(),
    /threshold|score|birthdays|factor/,
  );
  restore.mock.restore();
});
test("未認証の保存・取得・cron、別Originの保存を拒否", async () => {
  assert.equal(
    (await adminRoute.GET(new Request("https://local.test"))).status,
    401,
  );
  assert.equal(
    (await adminRoute.POST(request({ action: "refresh" }))).status,
    401,
  );
  assert.equal((await cron.GET(new Request("https://local.test"))).status, 401);
  authorized = true;
  assert.equal(
    (
      await adminRoute.POST(
        request({ action: "refresh" }, "https://other.test"),
      )
    ).status,
    403,
  );
  assert.equal(reads, 0);
});
test("設定プレビュー・保存→SQLの原子的保存→公開API（点数なし）まで確認", async () => {
  authorized = true;
  const c = structuredClone(DEFAULT_CONFIG);
  c.overrides = [
    {
      date: tomorrow,
      points: 1,
      level: "",
      weather: "",
      reason: "公開する調整理由",
      note: "SECRET_INTERNAL",
    },
  ];
  const restore = mock.method(globalThis, "fetch", async () => {
    external++;
    throw new Error("Unexpected network");
  });
  const preview = await adminRoute.POST(
    request({ action: "preview", config: c, revision: 0 }),
  );
  assert.equal(preview.status, 200);
  assert.equal(
    (
      await db.query<{ revision: number }>(
        "select revision from public.crowd_forecast_state",
      )
    ).rows[0].revision,
    0,
  );
  assert.equal(
    (await adminRoute.POST(request({ action: "save", config: c, revision: 0 })))
      .status,
    200,
  );
  const privateState = (await repository.readForecast()).state;
  assert.equal(privateState.days[tomorrow].input.slots, 24);
  assert.equal(privateState.days[tomorrow].threeRooms, true);
  assert.equal(privateState.history.length, 1);
  assert.equal(privateState.days[today], undefined);
  const result = await (
    await publicRoute.GET(
      new Request(`https://local.test/api/crowd-forecast?date=${tomorrow}`),
    )
  ).text();
  assert.match(result, /公開する調整理由/);
  assert.doesNotMatch(result, /score|factor|basic|SECRET_INTERNAL/);
  assert.equal(external, 0);
  restore.mock.restore();
});
test("保存済みの当日調整も再保存で公開へ反映し、変更・削除後も定期更新と通常保存は当日を固定", async () => {
  authorized = true;
  const state = emptyState(),
    yesterday = addDays(today, -1),
    now = new Date();
  const input: DayInput = {
    date: today, status: "open", opening: "10:00", closing: "20:00",
    schedule: "unconfirmed", fan: "unconfirmed", slots: 0, rooms: [],
    baselineDensities: [], birthdays: [],
  };
  const weather: Weather = {
    date: today, kind: "cloud", text: "くもり", region: "大分県 中部", station: "大分",
    high: 29, low: 19, rain: [], dailyRain: null,
    issuedAt: now.toISOString(), fetchedAt: now.toISOString(),
    validUntil: new Date(now.getTime() + 86400000).toISOString(),
    sourceUrl: "https://example.test/weather",
  };
  state.days[today] = calculate(input, state.config, state.holidays, weather, now);
  state.days[yesterday] = calculate({ ...input, date: yesterday }, state.config, state.holidays, null, now);
  const original = structuredClone(state.days);
  // Reproduce the incident: config saved successfully, but today's snapshot still lacks the adjustment.
  state.config.overrides = [{
    date: today, points: 5, level: "", weather: "", reason: "運動会振替休日", note: "SECRET_TODAY",
  }];
  await client.rpc("crowd_forecast_write", { p_revision: 0, p_payload: state, p_token: null });
  const config = structuredClone(state.config);
  const restore = mock.method(globalThis, "fetch", async () => {
    external++;
    throw new Error("Unexpected network");
  });
  try {
    const previewResponse = await adminRoute.POST(request({ action: "preview", config, revision: 1 }));
    assert.equal(previewResponse.status, 200);
    const preview = await previewResponse.json();
    assert.equal(preview.state.days[today].breakdown.manual, 5);
    assert.equal(preview.state.days[today].score, original[today].score! + 5);
    assert.deepEqual(preview.state.days[today].weather, weather);
    assert.deepEqual(preview.state.days[yesterday], original[yesterday]);
    assert.equal((await repository.readForecast()).revision, 1);
    assert.deepEqual((await repository.readForecast()).state.days[today], original[today]);

    assert.equal((await adminRoute.POST(request({ action: "save", config, revision: 1 }))).status, 200);
    const saved = (await repository.readForecast()).state;
    assert.deepEqual({ ...saved.days[today], updatedAt: null }, { ...preview.state.days[today], updatedAt: null });
    assert.deepEqual(saved.days[yesterday], original[yesterday]);
    for (const query of ["", `?date=${today}`]) {
      const response = await publicRoute.GET(new Request(`https://local.test/api/crowd-forecast${query}`));
      const text = await response.text();
      assert.match(text, /運動会振替休日/);
      assert.doesNotMatch(text, /SECRET_TODAY|score|breakdown|factor/);
    }

    config.overrides[0].level = "veryBusy";
    config.overrides[0].reason = "当日の調整変更";
    await repository.saveConfig(config, 2);
    assert.equal((await repository.readForecast()).state.days[today].level, "veryBusy");
    config.overrides = [];
    await repository.saveConfig(config, 3);
    const removed = (await repository.readForecast()).state;
    assert.equal(removed.days[today].breakdown.manual, 0);
    assert.equal(removed.days[today].score, original[today].score);
    assert.ok(!removed.days[today].topics.includes("当日の調整変更"));

    config.weekday.adjacent = 80;
    config.weekday.normal = 80;
    await repository.saveConfig(config, 4);
    assert.deepEqual((await repository.readForecast()).state.days[today], removed.days[today]);
    assert.equal(external, 0);
    restore.mock.restore();
    const refreshFetch = mock.method(globalThis, "fetch", async () => { throw new Error("Keep saved weather and holidays"); });
    try {
      await repository.updateForecast();
      const updated = (await repository.readForecast()).state;
      assert.deepEqual(updated.days[today], removed.days[today]);
      assert.deepEqual(updated.days[yesterday], original[yesterday]);
    } finally {
      refreshFetch.mock.restore();
    }
  } finally {
    restore.mock.restore();
  }
});

test("古いrevisionでの設定保存は競合を通知し、公開結果を上書きしない", async () => {
  authorized = true;
  await repository.saveConfig(DEFAULT_CONFIG, 0);
  assert.equal(
    (
      await adminRoute.POST(
        request({ action: "save", config: DEFAULT_CONFIG, revision: 0 }),
      )
    ).status,
    400,
  );
  assert.equal((await repository.readForecast()).revision, 1);
});
test("同時ジョブでも1日1回、同じURLを再取得しない", async () => {
  const short = readFileSync(resolve(__dirname, "fixtures/short.xml"), "utf8"),
    weekly = readFileSync(resolve(__dirname, "fixtures/weekly.xml"), "utf8");
  const feed = `<feed>${["VPFD51", "VPFW50"].map((t) => `<entry><id>https://www.data.jma.go.jp/developer/xml/data/20261018000000_0_${t}_440000.xml</id><updated>2026-10-18T00:00:00Z</updated></entry>`).join("")}</feed>`;
  const restore = mock.method(globalThis, "fetch", async (url: unknown) => {
    if (String(url).includes("cao.go.jp"))
      throw new Error("Use bundled holiday dates");
    external++;
    return new Response(
      String(url).includes("feed/")
        ? feed
        : String(url).includes("VPFD51")
          ? short
          : weekly,
    );
  });
  const result = await Promise.all([
    repository.updateForecast(),
    repository.updateForecast(),
  ]);
  assert.equal(result.filter((r) => r.skipped).length, 1);
  assert.equal(external, 3);
  assert.equal((await repository.updateForecast()).skipped, true);
  assert.equal(external, 3);
  const state = await repository.readForecast();
  assert.ok(state.state.days[tomorrow]);
  assert.equal(state.state.days[today], undefined);
  restore.mock.restore();
});
test("anon/authenticatedはテーブル・更新RPCのいずれにもアクセスできない", async () => {
  await db.exec("reset role;set role anon;");
  await assert.rejects(
    db.query("select * from public.crowd_forecast_state"),
    /permission denied/,
  );
  await assert.rejects(
    db.query(
      "select * from public.crowd_forecast_claim(current_date,gen_random_uuid())",
    ),
    /permission denied/,
  );
  await db.exec("reset role;set role authenticated;");
  await assert.rejects(
    db.query("select * from public.crowd_forecast_write(0,'{}',null)"),
    /permission denied/,
  );
});
test("更新リース中は通常保存できず、誤ったトークン・古いrevisionも拒否", async () => {
  const token = "00000000-0000-4000-8000-000000000001";
  const claim = await client.rpc("crowd_forecast_claim", {
    p_day: today,
    p_token: token,
  });
  assert.equal(claim.data.length, 1);
  const revision = Number(claim.data[0].revision),
    s = emptyState();
  const save = await client.rpc("crowd_forecast_write", {
    p_revision: revision,
    p_payload: s,
    p_token: null,
  });
  assert.equal(save.data.length, 0);
  assert.equal(
    (
      await client.rpc("crowd_forecast_write", {
        p_revision: revision - 1,
        p_payload: s,
        p_token: token,
      })
    ).data.length,
    0,
  );
  assert.equal(
    (
      await client.rpc("crowd_forecast_write", {
        p_revision: revision,
        p_payload: s,
        p_token: token,
      })
    ).data.length,
    1,
  );
});
