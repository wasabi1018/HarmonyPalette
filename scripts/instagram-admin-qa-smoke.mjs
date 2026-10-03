// Run against instagram-admin-qa-server.mjs --start. All writes target local fixtures.
import assert from "node:assert/strict";
import { createServerClient } from "@supabase/ssr";
import { createCanvas } from "@napi-rs/canvas";

async function main() {
  const cookies = new Map();
  const client = createServerClient("http://127.0.0.1:4301", "qa-public-key", {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (values) => values.forEach(({ name, value }) => cookies.set(name, value)),
    },
  });
  const login = await client.auth.signInWithPassword({ email: "instagram-qa@example.test", password: "fixture-only" });
  assert.equal(login.error, null);
  const cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  const origin = "http://localhost:3100";
  const request = (path, options = {}) => fetch(origin + path, { redirect: "manual", ...options, headers: { Cookie: cookie, Origin: origin, ...options.headers }, signal: AbortSignal.timeout(60000) });
  for (const [path, title] of [
    ["/admin/instagram", "Instagram"],
    ["/admin/instagram/create", "作成ツール"],
    ["/admin/instagram/create/crowd-calendar", "混雑予想カレンダー"],
    ["/admin/instagram/create/character-recommendations", "推しキャラおすすめ日"],
    ["/admin/instagram/create/schedule", "全体スケジュール"],
    ["/admin/instagram/create/fan-studio-weekly", "ファンスタジオ・週間"],
    ["/admin/instagram/create/fan-studio-daily", "ファンスタジオ・日別"],
    ["/admin/instagram/dm", "コメント連動DM"],
    ["/admin/instagram/dm/new", "DMキャンペーンを作成"],
    ["/admin/instagram/dm/deliveries", "DM送信状況"],
    ["/admin/instagram/settings", "サイト表示設定"],
  ]) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, new RegExp(`<h1[^>]*>${title}</h1>`));
    console.log(`PASS page ${path}`);
  }
  const unauthenticated = await fetch(origin + "/admin/instagram", { redirect: "manual" });
  assert.equal(unauthenticated.status, 307);
  assert.match(unauthenticated.headers.get("location"), /\/admin\/login/);
  assert.equal((await fetch(origin + "/api/admin/instagram-dm/campaigns")).status, 401);
  assert.equal((await request("/api/admin/instagram-dm/campaigns?id=invalid")).status, 400);
  assert.equal((await request("/admin/instagram/create/unknown")).status, 404);
  const listing = await (await request("/api/admin/instagram-dm/campaigns")).json();
  const id = listing.campaigns[0].id;
  const month = listing.campaigns[0].month;
  assert.equal((await request(`/admin/instagram/dm/${id}`)).status, 200);
  const creation = await request("/api/admin/instagram-dm/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, reelMediaId: "17840000000000001" }) });
  assert.equal(creation.status, 201);
  const created = await creation.json();
  const form = new FormData();
  form.set("campaignId", created.id); form.set("characterName", "クロミ"); form.set("keywords", "クロミ、くろみ"); form.set("dmText", "検証用のDM文章です。");
  const canvas = createCanvas(1080, 1350);
  const context = canvas.getContext("2d"); context.fillStyle = "#fff0f5"; context.fillRect(0, 0, 1080, 1350);
  form.set("image", new File([canvas.toBuffer("image/png")], "qa-ranking.png", { type: "image/png" }));
  const upload = await request("/api/admin/instagram-dm/assets", { method: "POST", body: form });
  assert.equal(upload.status, 201, await upload.text());
  const detail = await (await request(`/api/admin/instagram-dm/campaigns?id=${created.id}`)).json();
  assert.equal(detail.campaigns[0].instagram_dm_assets[0].character_name, "クロミ");
  assert.equal(detail.campaigns[0].status, "draft");
  assert.equal((await request("/api/admin/instagram-dm/campaigns", { method: "POST", headers: { Origin: "https://foreign.example", "Content-Type": "application/json" }, body: "{}" })).status, 403);
  console.log("PASS authentication, invalid IDs, campaign creation, PNG registration, draft status and Origin checks");
  await client.auth.stopAutoRefresh();
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
