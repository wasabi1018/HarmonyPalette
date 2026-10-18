/** Local-only UI fixture. Uses in-memory Postgres and fake credentials, never the remote project. */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  addDays,
  calculate,
  datesBetween,
  emptyState,
  japanDay,
  projectPublic,
  weekday,
} from "../lib/crowd-forecast/model";
import { mergeWeather, parseBulletin } from "../lib/crowd-forecast/weather";

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("This fixture is for local development only.");
  const db = new PGlite(),
    today = japanDay(),
    month = today.slice(0, 7),
    now = new Date();
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;",
  );
  await db.exec(
    await readFile(
      "supabase/migrations/20261018043350_crowd_forecast.sql",
      "utf8",
    ),
  );
  const state = emptyState(),
    short = parseBulletin(
      await readFile("lib/crowd-forecast/fixtures/short.xml", "utf8"),
      "VPFD51",
      now.toISOString(),
    ),
    weekly = parseBulletin(
      await readFile("lib/crowd-forecast/fixtures/weekly.xml", "utf8"),
      "VPFW50",
      now.toISOString(),
    );
  const weather = mergeWeather({ VPFD51: short, VPFW50: weekly }, [
    "VPFD51",
    "VPFW50",
  ]);
  state.updatedAt = now.toISOString();
  state.lastAttempt = today;
  state.config.birthdays.kuromi = 10;
  state.config.publications = [
    {
      id: "qa-schedule",
      name: "検証用の未公開日",
      from: `${month}-27`,
      to: `${month}-27`,
      schedule: "unpublished",
      fan: "published",
    },
    {
      id: "qa-fan",
      name: "検証用の未公開日",
      from: `${month}-26`,
      to: `${month}-26`,
      schedule: "published",
      fan: "unpublished",
    },
  ];
  const character = {
    id: "kuromi",
    slug: "kuromi",
    name: "クロミ",
    name_kana: "くろみ",
    birthday_month: 10,
    birthday_day: 31,
  };
  const schedules: Record<string, unknown>[] = [],
    operations: Record<string, unknown>[] = [];
  const end = new Date(
    Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) + 2, 0),
  )
    .toISOString()
    .slice(0, 10);
  for (const date of datesBetween(addDays(`${month}-01`, -56), end)) {
    const closed = [3, 4].includes(weekday(date)),
      night = [6, 0].includes(weekday(date)),
      opening = "10:00",
      closing = night ? "21:00" : "17:00",
      n = night ? 33 : 22;
    operations.push({
      operation_date: date,
      operating_status: closed ? "closed" : "open",
      opening_time: opening,
      closing_time: closing,
      publication_status: "published",
      verification_status: "verified",
    });
    const day = Number(date.slice(8, 10));
    const input = {
      date,
      status: closed ? ("closed" as const) : ("open" as const),
      opening,
      closing,
      schedule: day === 27 ? ("unpublished" as const) : ("published" as const),
      fan: day === 26 ? ("unpublished" as const) : ("published" as const),
      slots: n,
      rooms: night ? [101, 102, 103] : [101, 102],
      baselineDensities: [3, 3, 3, 3],
      birthdays: date.endsWith("10-31")
        ? [{ id: "kuromi", name: "クロミ" }]
        : [],
    };
    const forecast = calculate(
      input,
      state.config,
      state.holidays,
      weather[date] ?? null,
      now,
    );
    if (date >= `${month}-01`) state.days[date] = forecast;
    if (closed) continue;
    for (let i = 0; i < n; i++)
      schedules.push({
        id: `${date}-${i}`,
        external_key: `${date}-${i}`,
        source_id: "harmonyland-funstudio",
        source_reference: "local-fixture",
        kind: "greeting",
        title: "ファンスタジオ",
        event_date: date,
        end_date: null,
        start_time: `${10 + Math.floor(i / (night ? 3 : 2))}:00`,
        end_time: null,
        schedule_type: "ファンスタジオ",
        location: `${101 + (i % (night ? 3 : 2))}号室`,
        description: "",
        official_url: "https://www.harmonyland.jp/",
        updated_at: now.toISOString(),
        verification_status: "verified",
        schedule_characters: [
          { character_id: "kuromi", character_name: "クロミ" },
        ],
      });
    schedules.push({
      ...schedules.at(-1),
      id: `${date}-show`,
      source_id: "harmonyland",
      kind: "event",
      title: "パレード",
      location: "ステージ",
      schedule_type: "ショー",
      start_time: "12:00",
    });
  }
  await db.query(
    "update public.crowd_forecast_state set payload=$1::jsonb,last_attempt_day=$2::date",
    [process.env.CROWD_FORECAST_FIXTURE_STATE
      ? await readFile(process.env.CROWD_FORECAST_FIXTURE_STATE, "utf8")
      : JSON.stringify(state), today],
  );
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "qa@example.test",
    role: "authenticated",
    aud: "authenticated",
    app_metadata: { role: "admin", provider: "email" },
    user_metadata: {},
    created_at: now.toISOString(),
  };
  const token = [
    { alg: "HS256", typ: "JWT" },
    {
      sub: user.id,
      email: user.email,
      role: "authenticated",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
    },
    "fixture",
  ]
    .map((v, i) =>
      i === 2
        ? String(v)
        : Buffer.from(JSON.stringify(v)).toString("base64url"),
    )
    .join(".");
  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3018");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    res.setHeader("Access-Control-Expose-Headers", "content-range");
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    try {
      const u = new URL(req.url!, "http://127.0.0.1:3401"),
        chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      const body = raw ? JSON.parse(raw) : {};
      let result: unknown = [];
      if (u.pathname === "/auth/v1/token") {
        if (
          body.email !== "qa@example.test" ||
          body.password !== "local-preview-only"
        ) {
          res.writeHead(400, { "Content-Type": "application/json" }).end(
            JSON.stringify({
              error: "invalid_grant",
              error_description: "Local preview account only",
            }),
          );
          return;
        }
        result = {
          access_token: token,
          refresh_token: "qa-refresh-only",
          token_type: "bearer",
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          user,
        };
      } else if (u.pathname === "/auth/v1/user") result = user;
      else if (u.pathname === "/rest/v1/crowd_forecast_state")
        result = (await db.query("select * from public.crowd_forecast_state"))
          .rows[0];
      else if (u.pathname.startsWith("/rest/v1/rpc/")) {
        if (u.pathname.endsWith("crowd_forecast_claim"))
          result = (
            await db.query(
              "select * from public.crowd_forecast_claim($1::date,$2::uuid)",
              [body.p_day, body.p_token],
            )
          ).rows;
        else if (u.pathname.endsWith("crowd_forecast_write"))
          result = (
            await db.query(
              "select * from public.crowd_forecast_write($1::bigint,$2::jsonb,$3::uuid)",
              [body.p_revision, JSON.stringify(body.p_payload), body.p_token],
            )
          ).rows;
        else throw new Error("Unsupported fixture mutation");
      } else if (u.pathname === "/rest/v1/characters") result = [character];
      else if (u.pathname === "/rest/v1/park_operating_days")
        result = operations;
      else if (u.pathname === "/rest/v1/schedule_items") {
        const offset = Number(u.searchParams.get("offset") || 0),
          limit = Number(u.searchParams.get("limit") || 250);
        const to = u.searchParams
          .getAll("event_date")
          .find((v) => v.startsWith("lte."))
          ?.slice(4);
        const all = to
          ? schedules.filter((s) => String(s.event_date) <= to)
          : schedules;
        result = all.slice(offset, offset + limit);
        res.setHeader(
          "Content-Range",
          `${offset}-${Math.min(offset + limit, all.length) - 1}/${all.length}`,
        );
      } else if (u.pathname === "/fixture/snapshot")
        result = projectPublic(
          (
            await db.query<{ payload: typeof state }>(
              "select payload from public.crowd_forecast_state",
            )
          ).rows[0].payload,
        );
      else if (req.method !== "GET")
        throw new Error("Only crowd forecast fixture writes are allowed");
      res
        .writeHead(200, { "Content-Type": "application/json" })
        .end(JSON.stringify(result));
    } catch (e) {
      res
        .writeHead(500, { "Content-Type": "application/json" })
        .end(JSON.stringify({ message: String(e) }));
    }
  });
  server.listen(3401, "127.0.0.1", () => {
    console.log(
      "Local crowd forecast fixture: http://localhost:3018/crowd-forecast (in-memory database only)",
    );
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "-p",
        "3018",
        "-H",
        "127.0.0.1",
      ],
      {
        stdio: "inherit",
        windowsHide: true,
        env: {
          ...process.env,
          HARMONY_PREVIEW_DIST_DIR: ".tmp/crowd-forecast-preview-next",
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3401",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_fixture",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
          SUPABASE_SECRET_KEY: "sb_secret_local_fixture",
          SUPABASE_SERVICE_ROLE_KEY: "",
          ADMIN_EMAILS: "qa@example.test",
          ADMIN_IMPORT_SECRET: "local-preview-only",
          CRON_SECRET: "local-preview-cron",
        },
      },
    );
    child.on("exit", () => {
      server.close();
      void db.close();
    });
    process.on("SIGINT", () => {
      child.kill();
      server.close();
      void db.close();
    });
  });
}
void main();
