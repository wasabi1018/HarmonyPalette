import assert from "node:assert/strict";
import { after, before, beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createDefaultRakutenPrPlacement, getRakutenPrDefinition, parseRakutenPrPlacement, type RakutenPrPlacementDefinition } from "./rakuten-pr";
import { normalizeRakutenProduct } from "./rakuten-products";

const credentials = { applicationId: "fixture-rakuten-app", accessKey: "fixture-rakuten-secret", affiliateId: "fixture.affiliate" };
const definition = getRakutenPrDefinition("home-pickup");
const files = new Map<string, string>();
const buckets = new Map<string, { public: boolean }>();
const invalidated: string[] = [];
const providerCodes: string[] = [];
let access: { ok: boolean; reason?: string };
let configured = true;
let storageFailure = false;
let uploadFailure = false;
let storageCalls = 0;
let uploads = 0;
let apiCalls = 0;
let apiFailure: number | "network" | "malformed" | null = null;
let emptyProducts = false;
let wrapped = false;
let affiliateLinks = true;
const originalFetch = globalThis.fetch;

function rawProduct(index: number) {
  return {
    itemCode: `fixture-shop:${index}`, itemName: `テスト商品${index}`,
    itemUrl: `https://item.rakuten.co.jp/fixture-shop/${index}/`,
    affiliateUrl: affiliateLinks ? `https://hb.afl.rakuten.co.jp/fixture/${index}/` : "",
    mediumImageUrls: [{ imageUrl: `https://thumbnail.image.rakuten.co.jp/fixture/${index}.jpg?_ex=128x128` }],
    shopName: "検証用ショップ", availability: 1,
  };
}

const client = { storage: {
  getBucket: async (name: string) => {
    storageCalls++;
    return storageFailure ? { data: null, error: { message: `Storage failure ${credentials.accessKey}` } }
      : { data: buckets.get(name) ?? null, error: buckets.has(name) ? null : { message: "Bucket not found" } };
  },
  createBucket: async (name: string, options: { public: boolean; fileSizeLimit: number }) => {
    storageCalls++; assert.equal(name, "site-settings"); assert.equal(options.public, false); assert.equal(options.fileSizeLimit, 10240);
    buckets.set(name, { public: false }); return { error: null };
  },
  from: (name: string) => ({
    download: async (path: string) => {
      storageCalls++; const value = files.get(`${name}/${path}`);
      return value === undefined ? { data: null, error: { message: "Object not found" } } : { data: new Blob([value]), error: null };
    },
    upload: async (path: string, payload: Buffer, options: { upsert: boolean; contentType: string; cacheControl: string }) => {
      storageCalls++;
      assert.equal(name, "site-settings"); assert.equal(options.upsert, true); assert.equal(options.contentType, "application/json"); assert.equal(options.cacheControl, "0");
      assert.ok(payload.byteLength <= 10240);
      if (uploadFailure) return { error: { message: `Upload failure ${credentials.accessKey}` } };
      files.set(`${name}/${path}`, payload.toString("utf8")); uploads++; return { error: null };
    },
  }),
} };

mock.module("server-only", { defaultExport: {} });
mock.module("node:timers/promises", { namedExports: { setTimeout: async () => undefined } });
mock.module("next/cache", { namedExports: {
  unstable_cache: (callback: (...args: unknown[]) => unknown, keys: string[], options: { revalidate: number; tags: string[] }) => {
    assert.equal(options.revalidate, 3600); assert.deepEqual(options.tags, ["rakuten-pr-products"]);
    assert.equal(keys.some((key) => key.includes(credentials.accessKey) || key.includes(credentials.applicationId)), false);
    return callback;
  },
  revalidatePath: (path: string) => invalidated.push(path),
} });
mock.module(pathToFileURL(resolve(__dirname, "supabase/server.ts")), { namedExports: { getSupabaseAdminClient: () => configured ? client : null } });
mock.module(pathToFileURL(resolve(__dirname, "supabase/auth-server.ts")), { namedExports: { getAdminAccess: async () => access } });
mock.module(pathToFileURL(resolve(__dirname, "site-config.ts")), { namedExports: { SITE_URL: "https://example.test" } });

let searchRoute: typeof import("../app/api/admin/rakuten-products/route");
let placementRoute: typeof import("../app/api/admin/rakuten-pr/[placementId]/route");
let repository: typeof import("./rakuten-pr-settings");
let publicData: typeof import("./rakuten-pr-data");
before(async () => {
  searchRoute = await import(pathToFileURL(resolve(__dirname, "../app/api/admin/rakuten-products/route.ts")).href);
  placementRoute = await import(pathToFileURL(resolve(__dirname, "../app/api/admin/rakuten-pr/[placementId]/route.ts")).href);
  repository = await import(pathToFileURL(resolve(__dirname, "rakuten-pr-settings.ts")).href);
  publicData = await import(pathToFileURL(resolve(__dirname, "rakuten-pr-data.ts")).href);
});
beforeEach(() => {
  files.clear(); buckets.clear(); invalidated.length = 0; providerCodes.length = 0;
  buckets.set("site-settings", { public: false }); buckets.set("integration-secrets", { public: false });
  files.set("integration-secrets/rakuten.json", JSON.stringify({ ...credentials, updatedAt: "2026-10-06T00:00:00Z" }));
  access = { ok: true }; configured = true; storageFailure = false; uploadFailure = false;
  storageCalls = 0; uploads = 0; apiCalls = 0; apiFailure = null; emptyProducts = false; wrapped = false; affiliateLinks = true;
  globalThis.fetch = async (input, init) => {
    apiCalls++; const url = new URL(String(input));
    assert.equal(url.origin, "https://openapi.rakuten.co.jp");
    assert.equal(url.pathname, "/ichibams/api/IchibaItem/Search/20260701");
    assert.equal(url.searchParams.get("applicationId"), credentials.applicationId);
    assert.equal(url.searchParams.has("accessKey"), false);
    assert.equal(new Headers(init?.headers).get("accessKey"), credentials.accessKey);
    assert.equal(new Headers(init?.headers).get("Origin"), "https://example.test");
    assert.equal(init?.cache, "no-store"); assert.equal(init?.redirect, "error");
    assert.equal(url.searchParams.get("imageFlag"), "1"); assert.equal(url.searchParams.get("availability"), "1");
    if (apiFailure === "network") throw new Error(`Network failure ${url} ${credentials.accessKey}`);
    if (apiFailure === "malformed") return Response.json({ echo: credentials });
    if (apiFailure) return Response.json({ error: credentials.accessKey }, { status: apiFailure });
    const code = url.searchParams.get("itemCode");
    if (code) providerCodes.push(code);
    const items = emptyProducts ? [] : code ? [rawProduct(Number(code.split(":")[1]))] : [1, 2, 3, 4].map(rawProduct);
    return Response.json({ Items: wrapped ? items.map((Item) => ({ Item })) : items, count: code ? items.length : 25, page: Number(url.searchParams.get("page") || 1), pageCount: code ? 1 : 3 });
  };
});
after(() => { globalThis.fetch = originalFetch; });

function context(id = "home-pickup") { return { params: Promise.resolve({ placementId: id }) }; }
function draft(count = 4) {
  return { ...createDefaultRakutenPrPlacement(definition), items: Array.from({ length: count }, (_, index) => ({ itemCode: `fixture-shop:${index + 1}`, description: `紹介${index + 1}` })) };
}
function put(value: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/admin/rakuten-pr/home-pickup", { method: "PUT", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(value) });
}
function search(keyword = "タオル", page = "1") { return new Request(`https://example.test/api/admin/rakuten-products?${new URLSearchParams({ keyword, page })}`); }
async function safeBody(response: Response) {
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const payload = await response.text();
  assert.equal(payload.includes(credentials.accessKey), false); assert.equal(payload.includes(credentials.applicationId), false);
  return JSON.parse(payload);
}

test("unconfigured placements are disabled and make no product request", async () => {
  assert.equal(await publicData.getPublicRakutenPrPlacement("home-pickup"), null);
  const response = await placementRoute.GET(new Request("https://example.test"), context());
  assert.equal(response.status, 200); const body = await safeBody(response);
  assert.equal(body.placement.enabled, false); assert.deepEqual(body.placement.items, []); assert.equal(apiCalls, 0);
});

test("signed-out and non-admin users cannot search, read or save", async () => {
  for (const [reason, status] of [["unconfigured", 503], ["signed-out", 401], ["forbidden", 403]] as const) {
    access = { ok: false, reason };
    assert.equal((await searchRoute.GET(search())).status, status);
    assert.equal((await placementRoute.GET(new Request("https://example.test"), context())).status, status);
    assert.equal((await placementRoute.PUT(put(draft()), context())).status, status);
  }
  assert.equal(storageCalls, 0); assert.equal(apiCalls, 0); assert.equal(uploads, 0);
});

test("product search supports wrapped responses, safe metadata and pagination", async () => {
  wrapped = true;
  const response = await searchRoute.GET(search("タオル", "2"));
  assert.equal(response.status, 200); const body = await safeBody(response);
  assert.equal(body.result.products.length, 4); assert.equal(body.result.page, 2); assert.equal(body.result.pageCount, 3);
  assert.equal(body.result.products[0].imageUrl.includes("128x128"), true);
  assert.equal(body.result.products[0].affiliateUrl, "https://hb.afl.rakuten.co.jp/fixture/1/");
  assert.equal(uploads, 0);
});

test("invalid search input is rejected without calling the provider", async () => {
  for (const [keyword, page] of [["a", "1"], ["x".repeat(121), "1"], ["タオル", "0"], ["タオル", "101"], ["タオル", "1.5"]]) {
    assert.equal((await searchRoute.GET(search(keyword, page))).status, 400);
  }
  assert.equal(apiCalls, 0);
});

test("normalization rejects unsafe product and image URLs and unavailable items", () => {
  const valid = rawProduct(1);
  assert.ok(normalizeRakutenProduct(valid));
  assert.ok(normalizeRakutenProduct({ ...valid, mediumImageUrls: [valid.mediumImageUrls[0].imageUrl] }));
  for (const imageUrl of ["javascript:alert(1)", "https://thumbnail.image.rakuten.co.jp.evil.test/a.jpg", "https://user@thumbnail.image.rakuten.co.jp/a.jpg", "http://thumbnail.image.rakuten.co.jp/a.jpg"]) {
    assert.equal(normalizeRakutenProduct({ ...valid, mediumImageUrls: [{ imageUrl }] }), null);
  }
  assert.equal(normalizeRakutenProduct({ ...valid, itemUrl: "https://evil.test/product" }), null);
  assert.equal(normalizeRakutenProduct({ ...valid, availability: 0 }), null);
  assert.equal(normalizeRakutenProduct({ ...valid, affiliateUrl: "https://hb.afl.rakuten.co.jp.evil.test/link" })?.affiliateUrl, null);
});

test("draft saves keep only codes and editorial copy, not credentials or browser-supplied product URLs", async () => {
  const value = draft(2);
  const response = await placementRoute.PUT(put({ ...value, items: value.items.map((item) => ({ ...item, imageUrl: "https://evil.test/a", affiliateUrl: "javascript:alert(1)" })), accessKey: "should-not-store" }), context());
  assert.equal(response.status, 200); await safeBody(response);
  const stored = files.get("site-settings/rakuten-pr/home-pickup.json")!;
  assert.equal(stored.includes("evil.test"), false); assert.equal(stored.includes("should-not-store"), false);
  assert.equal(stored.includes(credentials.accessKey), false); assert.equal(stored.includes("itemName"), false);
  assert.equal(JSON.parse(stored).enabled, false); assert.equal(apiCalls, 0);
  assert.equal(await publicData.getPublicRakutenPrPlacement("home-pickup"), null);
});

test("saving creates a private settings bucket when missing", async () => {
  buckets.delete("site-settings");
  const response = await placementRoute.PUT(put(draft(0)), context());
  assert.equal(response.status, 200); assert.equal(buckets.get("site-settings")?.public, false); assert.equal(uploads, 1);
});

test("publishing verifies all four affiliate links and preserves editorial ordering", async () => {
  const value = draft(); value.enabled = true; value.items.reverse();
  const response = await placementRoute.PUT(put(value), context());
  assert.equal(response.status, 200); await safeBody(response);
  assert.deepEqual(providerCodes, ["fixture-shop:4", "fixture-shop:3", "fixture-shop:2", "fixture-shop:1"]);
  assert.ok(invalidated.includes("/")); assert.ok(invalidated.includes("/admin/rakuten-pr"));
  const display = await publicData.getPublicRakutenPrPlacement("home-pickup");
  assert.deepEqual(display?.items.map((item) => item.itemCode), value.items.map((item) => item.itemCode));
  assert.equal(display?.items[0].description, "紹介4");
});

test("incomplete and duplicate selections cannot be published", async () => {
  const incomplete = { ...draft(3), enabled: true };
  const duplicate = draft(); duplicate.items[3] = duplicate.items[0];
  for (const value of [incomplete, duplicate, draft(5), { ...draft(), title: "" }, { ...draft(), enabled: "true" }, { ...draft(), items: [{ itemCode: "../private", description: "" }] }]) {
    assert.equal((await placementRoute.PUT(put(value), context())).status, 400);
  }
  assert.equal(apiCalls, 0); assert.equal(uploads, 0);
});

test("publishing without affiliate settings or without provider affiliate links is refused", async () => {
  files.set("integration-secrets/rakuten.json", JSON.stringify({ ...credentials, affiliateId: "" }));
  const value = { ...draft(), enabled: true };
  assert.equal((await placementRoute.PUT(put(value), context())).status, 400); assert.equal(apiCalls, 0);
  files.set("integration-secrets/rakuten.json", JSON.stringify(credentials)); affiliateLinks = false;
  assert.equal((await placementRoute.PUT(put(value), context())).status, 400); assert.equal(uploads, 0);
});

test("future placement settings do not overwrite TOP or guide settings", async () => {
  const future: RakutenPrPlacementDefinition = { id: "article-pickup", label: "記事", location: "本文の下", itemLimit: 2, revalidatePaths: ["/articles"] };
  const guides = '{"guideCards":[]}'; files.set("site-settings/homepage/guide-cards.json", guides);
  const top = await repository.updateRakutenPrPlacement(definition, draft());
  const article = { ...createDefaultRakutenPrPlacement(future), title: "記事で紹介したアイテム", items: draft(2).items };
  await repository.updateRakutenPrPlacement(future, article);
  assert.equal((await repository.getRakutenPrPlacement(definition)).title, top.title);
  assert.equal((await repository.getRakutenPrPlacement(future)).title, article.title);
  assert.equal(files.get("site-settings/homepage/guide-cards.json"), guides);
});

test("unknown placements and cross-origin writes are rejected", async () => {
  assert.equal((await placementRoute.PUT(put(draft()), context("../../integration-secrets/rakuten"))).status, 404);
  assert.equal((await placementRoute.PUT(put(draft(), { Origin: "https://other.test" }), context())).status, 403);
  assert.equal((await placementRoute.PUT(put(draft(), { "Content-Type": "text/plain" }), context())).status, 400);
  assert.equal(uploads, 0); assert.equal(apiCalls, 0);
});

test("oversized and invalid JSON do not change saved content", async () => {
  const invalid = new Request("https://example.test", { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal((await placementRoute.PUT(invalid, context())).status, 400);
  assert.equal((await placementRoute.PUT(put({ ignored: "x".repeat(17000) }), context())).status, 400);
  assert.equal(uploads, 0);
});

test("provider failures are redacted and cannot publish or break the public page", async () => {
  const value = { ...draft(), enabled: true };
  for (const failure of [400, 401, 403, 429, 500, "network", "malformed"] as const) {
    apiFailure = failure;
    const response = await placementRoute.PUT(put(value), context());
    assert.equal(response.status, 502); await safeBody(response);
    const searchResponse = await searchRoute.GET(search());
    assert.equal(searchResponse.status, 502); await safeBody(searchResponse);
  }
  assert.equal(uploads, 0);
  files.set("site-settings/rakuten-pr/home-pickup.json", JSON.stringify(value));
  assert.equal(await publicData.getPublicRakutenPrPlacement("home-pickup"), null);
});

test("out-of-stock and unlinked products are omitted from public display", async () => {
  const value = { ...draft(), enabled: true };
  files.set("site-settings/rakuten-pr/home-pickup.json", JSON.stringify(value));
  emptyProducts = true;
  assert.equal(await publicData.getPublicRakutenPrPlacement("home-pickup"), null);
  emptyProducts = false; affiliateLinks = false;
  assert.equal(await publicData.getPublicRakutenPrPlacement("home-pickup"), null);
});

test("public settings storage, corrupt content and transport errors are not overwritten", async () => {
  buckets.set("site-settings", { public: true });
  assert.equal((await placementRoute.PUT(put(draft()), context())).status, 503);
  buckets.set("site-settings", { public: false });
  files.set("site-settings/rakuten-pr/home-pickup.json", "{ broken");
  assert.equal((await placementRoute.PUT(put(draft()), context())).status, 503);
  assert.equal(files.get("site-settings/rakuten-pr/home-pickup.json"), "{ broken");
  files.delete("site-settings/rakuten-pr/home-pickup.json"); storageFailure = true;
  const response = await placementRoute.PUT(put(draft()), context());
  assert.equal(response.status, 503); await safeBody(response); assert.equal(uploads, 0);
});

test("upload failure and missing server configuration never report a save as successful", async () => {
  uploadFailure = true;
  const response = await placementRoute.PUT(put(draft()), context());
  assert.equal(response.status, 503); await safeBody(response); assert.equal(uploads, 0);
  configured = false;
  assert.equal((await placementRoute.PUT(put(draft()), context())).status, 503);
  assert.equal(await publicData.getPublicRakutenPrPlacement("home-pickup"), null);
});

test("pure input parsing strips unrelated fields and keeps future placements configurable", () => {
  const parsed = parseRakutenPrPlacement({ ...draft(), ignored: credentials, placementId: "other" }, definition);
  assert.equal(parsed.placementId, "home-pickup"); assert.equal("ignored" in parsed, false);
});
