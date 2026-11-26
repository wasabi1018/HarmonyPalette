// Local-only Supabase-shaped adapter backed by real isolated PostgreSQL.
// It is not imported by application code and never reads production credentials.
import { createServer } from "node:http";
import { createHotelTestDatabase } from "./hotel-test-database";
import { starterHotels } from "../lib/hotels/starters";
import { parseHotel } from "../lib/hotels/model";
async function main() {
  const db = await createHotelTestDatabase();
  const articleFixtures = process.argv.includes("--article-links");
  if (articleFixtures) {
    // Support the existing guide-aware article reader without contacting a hosted database.
    await db.exec("alter table public.articles add column is_strategy_guide boolean not null default false, add column guide_event_key text, add column guide_category_id uuid, add column guide_display_order integer");
    for (const [index, status] of ["published", "draft", "scheduled", "published"].entries()) {
      await db.query("insert into public.articles(id,title,slug,excerpt,seo_title,seo_description,content_json,content_html,status,destination,published_at) values($1,$2,$3,'','','',$4::jsonb,$5,$6,'articles',$7)", [
        `8aff0000-0000-4000-8000-${String(index + 11).padStart(12, "0")}`,
        `ローカル検証専用ホテル記事 ${index + 1}`,
        `local-hotel-article-${index + 1}`,
        JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "本番には登録しないローカル確認用の本文です。" }] }] }),
        "<p>本番には登録しないローカル確認用の本文です。</p>", status,
        status === "scheduled" ? "2035-01-01T00:00:00Z" : "2026-11-24T00:00:00Z",
      ]);
      if (index === 3) await db.query("update public.articles set deleted_at=now() where id=$1", ["8aff0000-0000-4000-8000-000000000014"]);
    }
  }
  for (const starter of starterHotels())
    await db.query("select public.save_hotel($1::jsonb,null)", [
      JSON.stringify(
        parseHotel({ ...starter, status: "published", articleId: articleFixtures
          ? starter.slug === "fico-hiji" ? "8aff0000-0000-4000-8000-000000000011"
            : starter.slug === "grand-mercure-beppu-bay" ? "8aff0000-0000-4000-8000-000000000012"
            : starter.slug === "grandvrio-beppuwan-wakura" ? "8aff0000-0000-4000-8000-000000000013"
            : starter.slug === "kamenoi-hotel-beppu" ? "8aff0000-0000-4000-8000-000000000014" : ""
          : "" }),
      ),
    ]);
  const user = {
    id: "8aff0000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "qa@example.test",
    app_metadata: { role: "admin", provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 14400, iat: Math.floor(Date.now() / 1000), app_metadata: user.app_metadata })}.local-only-signature`;
  const session = {
    access_token: token,
    token_type: "bearer",
    expires_in: 14400,
    expires_at: Math.floor(Date.now() / 1000) + 14400,
    refresh_token: "local-only-refresh",
    user,
  };
  const files = new Map<string, Buffer>();
  const tables = new Set([
    "hotels",
    "hotel_areas",
    "hotel_tags",
    "hotel_images",
    "hotel_booking_links",
    "hotel_tag_relations",
    "hotel_daily_events",
    "travel_spots",
    "article_travel_metadata",
    "article_spots",
    "articles",
    "article_revisions",
  ]);
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1:45451");
    if (
      request.headers.origin &&
      /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(request.headers.origin)
    ) {
      response.setHeader("Access-Control-Allow-Origin", request.headers.origin);
      response.setHeader("Vary", "Origin");
      response.setHeader(
        "Access-Control-Allow-Headers",
        request.headers["access-control-request-headers"] ||
          "authorization,apikey,content-type,x-client-info",
      );
      response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }
    const send = (value: unknown, status = 200) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(value));
    };
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const bytes = Buffer.concat(chunks);
      const body =
        bytes.length && request.headers["content-type"]?.includes("json")
          ? JSON.parse(bytes.toString())
          : {};
      if (url.pathname === "/auth/v1/token") {
        if (
          body.grant_type === "refresh_token" ||
          body.refresh_token === session.refresh_token ||
          (body.email === user.email && body.password === "local-hotel-qa")
        )
          send(session);
        else
          send(
            {
              error: "invalid_grant",
              message: "Local QA credentials required",
            },
            400,
          );
        return;
      }
      if (url.pathname === "/auth/v1/user") {
        if (request.headers.authorization === `Bearer ${token}`) send(user);
        else send({ message: "No local session", code: "bad_jwt" }, 401);
        return;
      }
      if (url.pathname === "/auth/v1/logout") {
        send({});
        return;
      }
      const isAdmin = request.headers.apikey === "qa-service-role";
      if (url.pathname.startsWith("/storage/v1/")) {
        const path = url.pathname.split("hotel-images/")[1];
        if (!isAdmin || !path) {
          send({ message: "not found" }, 404);
          return;
        }
        if (request.method === "POST") {
          files.set(path, bytes);
          send({ Key: `hotel-images/${path}`, Id: path });
          return;
        }
        const data = files.get(path);
        if (!data) {
          send({ message: "not found" }, 404);
          return;
        }
        response.writeHead(200, { "Content-Type": "image/webp" }).end(data);
        return;
      }
      if (url.pathname.startsWith("/rest/v1/rpc/")) {
        if (!isAdmin) {
          send({ code: "42501", message: "denied" }, 403);
          return;
        }
        const name = url.pathname.split("/").at(-1);
        const functions: Record<string, [string, unknown[]]> = {
          save_article_with_travel: [
            "select public.save_article_with_travel($1::uuid,$2::jsonb,$3::uuid) result",
            [body.p_id, JSON.stringify(body.p_input), body.p_user_id],
          ],
          save_hotel: [
            "select public.save_hotel($1::jsonb,$2::timestamptz) result",
            [JSON.stringify(body.p_input), body.p_expected_updated_at],
          ],
          set_hotel_deleted: [
            "select public.set_hotel_deleted($1::uuid,$2::boolean,$3::timestamptz) result",
            [body.p_id, body.p_deleted, body.p_expected_updated_at],
          ],
          record_hotel_events: [
            "select public.record_hotel_events($1::jsonb) result",
            [JSON.stringify(body.p_events)],
          ],
        };
        const fn = functions[name || ""];
        if (!fn) {
          send(true);
          return;
        }
        const result = await db.transaction(async (tx) => {
          await tx.exec("set local role service_role");
          return tx.query<{ result: unknown }>(fn[0], fn[1]);
        });
        send(result.rows[0]?.result ?? null);
        return;
      }
      if (url.pathname.startsWith("/rest/v1/")) {
        const table = url.pathname.split("/")[3];
        if (!tables.has(table)) {
          send([]);
          return;
        }
        if (request.method === "POST") {
          if (!isAdmin || !["hotel_areas", "hotel_tags"].includes(table)) {
            send({ message: "denied" }, 403);
            return;
          }
          await db.query(
            `insert into public.${table}(id,name,sort_order,active) values($1,$2,$3,$4) on conflict(id) do update set name=excluded.name,sort_order=excluded.sort_order,active=excluded.active`,
            [body.id, body.name, body.sort_order, body.active],
          );
          send(null, 201);
          return;
        }
        let rows = await db.transaction(async (tx) => {
          await tx.exec(`set local role ${isAdmin ? "service_role" : "anon"}`);
          const sql =
            table === "hotels"
              ? "select to_jsonb(h)||jsonb_build_object('spot',to_jsonb(s)) data from public.hotels h join public.travel_spots s on s.id=h.id"
              : `select to_jsonb(t) data from public.${table} t`;
          return (
            await tx.query<{ data: Record<string, unknown> }>(sql)
          ).rows.map((row) => row.data);
        });
        const prop = (row: Record<string, unknown>, key: string): unknown =>
          key
            .split(".")
            .reduce<unknown>(
              (v, k) =>
                v && typeof v === "object"
                  ? (v as Record<string, unknown>)[k]
                  : null,
              row,
            );
        for (const [key, filter] of url.searchParams) {
          if (["select", "order", "limit", "offset"].includes(key)) continue;
          const dot = filter.indexOf(".");
          const op = filter.slice(0, dot);
          const value = filter.slice(dot + 1);
          rows = rows.filter((row) => {
            const current = prop(row, key);
            if (op === "is")
              return value === "null"
                ? current == null
                : String(current) === value;
            if (op === "eq") return String(current) === value;
            if (op === "gte") return String(current) >= value;
            if (op === "lte") return String(current) <= value;
            if (op === "in")
              return value.slice(1, -1).split(",").includes(String(current));
            return true;
          });
        }
        const orders = (url.searchParams.get("order") || "")
          .split(",")
          .filter(Boolean);
        rows.sort((a, b) => {
          for (const entry of orders) {
            const [key, direction] = entry.split(".");
            const av = prop(a, key);
            const bv = prop(b, key);
            const diff =
              typeof av === "number" && typeof bv === "number"
                ? av - bv
                : String(av).localeCompare(String(bv));
            if (diff) return direction === "desc" ? -diff : diff;
          }
          return 0;
        });
        const offset = Number(url.searchParams.get("offset") || 0),
          limit = Number(url.searchParams.get("limit") || 1000);
        rows = rows.slice(offset, offset + limit);
        if (String(request.headers.accept).includes("object+json"))
          send(rows[0] ?? null);
        else send(rows);
        return;
      }
      send({ localOnly: true, database: "isolated PGlite", hotels: 6 });
    } catch (error) {
      const e = error as { code?: string; message?: string };
      console.error("QA adapter:", e.code, e.message);
      send(
        {
          code: e.code || "QA_ERROR",
          message: e.message || "QA adapter error",
        },
        400,
      );
    }
  });
  server.listen(45451, "127.0.0.1", () =>
    console.log(
      "Hotel QA adapter ready on 127.0.0.1:45451. Six local fixtures; no hosted database or real credentials.",
    ),
  );
  process.on("SIGTERM", () => {
    server.close();
    void db.close();
  });
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
