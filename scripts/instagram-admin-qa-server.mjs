// Local-only fixture backend. The app's normal authentication and API routes remain enabled.
import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const fixturePort = 4301;
const appPort = 3100;
const email = "instagram-qa@example.test";
const userId = "11111111-1111-4111-8111-111111111111";
const campaignId = "22222222-2222-4222-8222-222222222222";
const month = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date()).slice(0, 7);
const user = { id: userId, email, aud: "authenticated", role: "authenticated", app_metadata: { role: "admin", provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const encode = (data) => Buffer.from(JSON.stringify(data)).toString("base64url");
const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 86400 })}`;
const token = `${unsigned}.${createHmac("sha256", "local-qa-only").update(unsigned).digest("base64url")}`;
const campaign = { id: campaignId, month, reel_media_id: "17840000000000000", status: "draft", created_at: "2026-10-01T00:00:00Z", instagram_dm_assets: [] };
const campaigns = [campaign];
const files = new Map();
const characters = ["シナモロール", "クロミ"].map((name, index) => ({ id: `33333333-3333-4333-8333-33333333333${index}`, slug: `qa-${index}`, name, name_kana: name, image_url: "/character-placeholder.svg", description: "", official_url: "", is_fan_studio_regular: true, theme_color: "#eb6e98", display_order: index, birthday_month: null, birthday_day: null }));
const dates = Array.from({ length: new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate() }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
const schedules = dates.flatMap((date, index) => characters.map((character, characterIndex) => ({ id: `${index}-${characterIndex}`, kind: "greeting", title: `${character.name} ファンスタジオグリーティング`, event_date: date, start_time: "10:00:00", end_time: "10:30:00", location: `ファンスタジオ10${characterIndex + 1}号室`, schedule_type: "ファンスタジオグリーティング", description: "", official_url: "", source_id: "harmonyland-funstudio", verification_status: "verified", publication_status: "published", updated_at: "2026-10-01T00:00:00Z", schedule_characters: [{ character_id: character.id, character_name: character.name }] })));
const operatingDays = dates.map((date) => ({ id: date, operation_date: date, operating_status: "open", opening_time: "10:00:00", closing_time: "17:00:00", source_title: "QA", notes: "", official_url: "", updated_at: "2026-10-01T00:00:00Z" }));

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${fixturePort}`);
  response.setHeader("Access-Control-Allow-Origin", `http://localhost:${appPort}`);
  response.setHeader("Access-Control-Allow-Headers", "authorization,apikey,content-type,x-client-info,x-supabase-api-version");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,OPTIONS");
  if (request.method === "OPTIONS") { response.writeHead(204).end(); return; }
  const json = (data, status = 200) => { response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(data)); };
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  if (url.pathname === "/auth/v1/token") {
    const credentials = JSON.parse(body.toString() || "{}");
    if (credentials.email !== email || credentials.password !== "fixture-only") return json({ message: "Invalid QA credentials" }, 400);
    return json({ access_token: token, token_type: "bearer", refresh_token: "qa-refresh", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, user });
  }
  if (url.pathname === "/auth/v1/user") return request.headers.authorization === `Bearer ${token}` ? json(user) : json({ message: "Not authenticated" }, 401);
  if (url.pathname.startsWith("/storage/v1/bucket/")) return json({ id: "site-settings", name: "site-settings", public: false });
  if (url.pathname.startsWith("/storage/v1/object/")) {
    const storagePath = url.pathname.replace(/^\/storage\/v1\/object\/(authenticated\/|public\/)?/, "");
    if (request.method === "GET") {
      if (!files.has(storagePath)) return json({ message: "Object not found", statusCode: "404" }, 404);
      response.writeHead(200, { "Content-Type": "application/octet-stream" }).end(files.get(storagePath)); return;
    }
    files.set(storagePath, body); return json({ Key: storagePath });
  }
  const table = url.pathname.replace("/rest/v1/", "");
  if (table === "instagram_dm_campaigns") {
    if (request.method === "POST") { const values = JSON.parse(body.toString()); const created = { ...campaign, id: randomUUID(), month: values.month, reel_media_id: values.reel_media_id, instagram_dm_assets: [] }; campaigns.unshift(created); return json({ id: created.id }, 201); }
    const target = url.searchParams.get("id")?.replace(/^eq\./, "");
    const selected = target ? campaigns.filter((item) => item.id === target) : campaigns;
    if (request.method === "PATCH") { const values = JSON.parse(body.toString()); Object.assign(selected[0], values); return json(selected[0]); }
    return json(selected);
  }
  if (table === "instagram_dm_assets") {
    if (request.method === "POST") { const values = JSON.parse(body.toString()); const asset = { id: randomUUID(), ...values }; campaigns.find((item) => item.id === values.campaign_id)?.instagram_dm_assets.push(asset); return json({ id: asset.id }, 201); }
    return json([]);
  }
  if (table === "instagram_dm_deliveries") return json([{ id: "qa-delivery", campaign_id: campaignId, comment_id: "qa-comment", status: "needs_review", follow_status: "unknown", last_error: "QA: 送信結果の確認が必要です。" }]);
  if (table === "characters") return json(characters);
  if (table === "schedules") return json(schedules);
  if (table === "park_operating_days") return json(operatingDays);
  if (url.pathname.startsWith("/rest/v1/")) return json([]);
  return json({ message: "Unknown fixture endpoint" }, 404);
});

server.listen(fixturePort, "127.0.0.1", () => {
  console.log(`Fixture backend: http://127.0.0.1:${fixturePort}`);
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fixturePort}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "qa-public-key", NEXT_PUBLIC_SUPABASE_ANON_KEY: "qa-public-key", SUPABASE_SECRET_KEY: "qa-secret-key", SUPABASE_SERVICE_ROLE_KEY: "qa-secret-key", NEXT_PUBLIC_SITE_URL: `http://localhost:${appPort}`, ADMIN_EMAILS: email, META_ACCESS_TOKEN: "", META_INSTAGRAM_USER_ID: "", INSTAGRAM_ACCESS_TOKEN: "", INSTAGRAM_USER_ID: "" };
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", process.argv.includes("--start") ? "start" : "dev", "-p", String(appPort), "-H", "localhost"], { env, stdio: "inherit" });
  const stop = () => { child.kill(); server.close(); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  child.on("exit", () => server.close());
});
