import assert from "node:assert/strict";
import { before, beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createDefaultRakutenBanner, getRakutenBannerDefinition, parseRakutenBanner } from "./rakuten-banner";

const definition = getRakutenBannerDefinition("home-between-articles-birthday");
const files = new Map<string, string>();
const invalidated: string[] = [];
let access: { ok: boolean; reason?: string };
let configured = true;
let bucket: { public: boolean } | null;
let storageFailure = false;
let uploadFailure = false;
let storageCalls = 0;
let uploads = 0;
const storageMessage = "provider-secret-must-not-leak";
const client = { storage: {
  getBucket: async () => {
    storageCalls++;
    return { data: bucket, error: storageFailure ? { message: storageMessage } : bucket ? null : { message: "Bucket not found" } };
  },
  createBucket: async (name: string, options: { public: boolean }) => {
    assert.equal(name, "site-settings"); assert.equal(options.public, false);
    bucket = { public: false }; return { error: null };
  },
  from: (name: string) => ({
    download: async (path: string) => {
      storageCalls++; assert.equal(name, "site-settings");
      const content = files.get(path);
      return content === undefined ? { data: null, error: { message: "Object not found" } } : { data: new Blob([content]), error: null };
    },
    upload: async (path: string, body: Buffer, options: { upsert: boolean; cacheControl: string; contentType: string }) => {
      storageCalls++; assert.equal(name, "site-settings");
      assert.deepEqual(options, { upsert: true, cacheControl: "0", contentType: "application/json" });
      if (uploadFailure) return { error: { message: storageMessage } };
      files.set(path, body.toString("utf8")); uploads++; return { error: null };
    },
  }),
} };

mock.module("server-only", { defaultExport: {} });
mock.module("next/cache", { namedExports: { revalidatePath: (path: string) => invalidated.push(path) } });
mock.module(pathToFileURL(resolve(__dirname, "supabase/server.ts")), { namedExports: { getSupabaseAdminClient: () => configured ? client : null } });
mock.module(pathToFileURL(resolve(__dirname, "supabase/auth-server.ts")), { namedExports: { getAdminAccess: async () => access } });
let route: typeof import("../app/api/admin/rakuten-banners/[placementId]/route");
let repository: typeof import("./rakuten-banner-settings");
before(async () => {
  route = await import(pathToFileURL(resolve(__dirname, "../app/api/admin/rakuten-banners/[placementId]/route.ts")).href);
  repository = await import(pathToFileURL(resolve(__dirname, "rakuten-banner-settings.ts")).href);
});
beforeEach(() => {
  files.clear(); invalidated.length = 0; access = { ok: true }; configured = true;
  bucket = { public: false }; storageFailure = false; uploadFailure = false; uploads = 0; storageCalls = 0;
});
function context(id = definition.id) { return { params: Promise.resolve({ placementId: id }) }; }
function request(value = createDefaultRakutenBanner(definition), headers = {}) {
  return new Request(`https://example.test/api/admin/rakuten-banners/${definition.id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(value) });
}
const path = `rakuten-banners/${definition.id}.json`;
const get = () => route.GET(new Request("https://example.test"), context());

test("initial TOP uses the supplied banner without writing settings or needing Rakuten API credentials", async () => {
  const banner = await repository.getPublicRakutenBanner(definition.id);
  assert.equal(banner?.enabled, true);
  assert.ok(banner?.imageUrl.includes("me_adv_id=2794883"));
  assert.equal(banner?.width, 468); assert.equal(banner?.height, 60);
  assert.equal(uploads, 0);
});
test("signed-out, forbidden and unconfigured admin requests cannot read or mutate banners", async () => {
  for (const [reason, status] of [["unauthenticated", 401], ["forbidden", 403], ["unconfigured", 503]] as const) {
    access = { ok: false, reason };
    assert.equal((await get()).status, status);
    assert.equal((await route.PUT(request(), context())).status, status);
  }
  assert.equal(storageCalls, 0); assert.equal(uploads, 0);
});
test("replacement preserves encoded affiliate parameters and does not overwrite product or guide settings", async () => {
  files.set("rakuten-pr/home-pickup.json", "existing-products"); files.set("homepage/guide-cards.json", "existing-guides");
  const replacement = { ...createDefaultRakutenBanner(definition), linkUrl: "https://hb.afl.rakuten.co.jp/hsc/fixture/?ut=a%2Bb%3D&link_type=pict", alt: "新しい楽天バナー", width: 300, height: 250, html: "<script>untrusted</script>" };
  const response = await route.PUT(request(replacement), context());
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
  const saved = JSON.parse(files.get(path)!);
  assert.equal(saved.linkUrl, replacement.linkUrl); assert.equal(saved.alt, replacement.alt); assert.equal(saved.html, undefined);
  assert.ok(saved.updatedAt); assert.equal(saved.width, 300);
  assert.equal(files.get("rakuten-pr/home-pickup.json"), "existing-products"); assert.equal(files.get("homepage/guide-cards.json"), "existing-guides");
  assert.deepEqual(invalidated, ["/", "/admin/rakuten-pr"]);
  assert.equal((await (await get()).json()).banner.alt, replacement.alt);
});
test("turning visibility off survives reads and removes the public banner", async () => {
  assert.equal((await route.PUT(request({ ...createDefaultRakutenBanner(definition), enabled: false }), context())).status, 200);
  assert.equal(await repository.getPublicRakutenBanner(definition.id), null);
  assert.equal((await repository.getRakutenBanner(definition)).enabled, false);
});
test("unsafe schemes, hosts, credentials and ports are rejected before storage", async () => {
  for (const linkUrl of ["javascript:alert(1)", "http://hb.afl.rakuten.co.jp/", "https://hb.afl.rakuten.co.jp.evil.test/", "https://user:pass@hb.afl.rakuten.co.jp/", "https://hb.afl.rakuten.co.jp:444/", "//hb.afl.rakuten.co.jp/", "https://evil.test/"]) {
    const response = await route.PUT(request({ ...createDefaultRakutenBanner(definition), linkUrl }), context());
    assert.equal(response.status, 400, linkUrl);
  }
  for (const imageUrl of ["data:image/svg+xml,<svg/>", "https://evil.test/tracker.gif", "https://hbb.afl.rakuten.co.jp.evil.test/", "http://hbb.afl.rakuten.co.jp/"]) {
    assert.equal((await route.PUT(request({ ...createDefaultRakutenBanner(definition), imageUrl }), context())).status, 400);
  }
  assert.equal(storageCalls, 0); assert.equal(uploads, 0);
});
test("unknown placements, cross-origin and non-JSON requests are refused", async () => {
  assert.equal((await route.PUT(request(), context("unknown"))).status, 404);
  assert.equal((await route.PUT(request(undefined, { Origin: "https://evil.test" }), context())).status, 403);
  assert.equal((await route.PUT(request(undefined, { "Content-Type": "text/plain" }), context())).status, 400);
  assert.equal(uploads, 0);
});
test("malformed and oversized request bodies do not change saved content", async () => {
  for (const body of ["{", JSON.stringify({ extra: "a".repeat(17000) })]) {
    const response = await route.PUT(new Request("https://example.test/api", { method: "PUT", headers: { "Content-Type": "application/json" }, body }), context());
    assert.equal(response.status, 400);
  }
  assert.equal(storageCalls, 0);
});
test("missing settings bucket is privately created on the first save", async () => {
  bucket = null;
  assert.equal((await route.PUT(request(), context())).status, 200);
  assert.equal((bucket as { public: boolean } | null)?.public, false);
  assert.equal(uploads, 1);
});
test("public or corrupt settings are refused and hidden publicly without overwriting them", async () => {
  bucket = { public: true };
  assert.equal((await get()).status, 503); assert.equal((await route.PUT(request(), context())).status, 503);
  assert.equal(await repository.getPublicRakutenBanner(definition.id), null);
  bucket = { public: false };
  for (const content of ["{", JSON.stringify({ ...createDefaultRakutenBanner(definition), placementId: "other" }), JSON.stringify({ ...createDefaultRakutenBanner(definition), imageUrl: "https://evil.test/" })]) {
    files.set(path, content);
    assert.equal((await get()).status, 503);
    assert.equal((await route.PUT(request(), context())).status, 503);
    assert.equal(await repository.getPublicRakutenBanner(definition.id), null);
    assert.equal(files.get(path), content);
  }
  assert.equal(uploads, 0);
});
test("storage and upload failures return safe errors and do not claim success", async () => {
  storageFailure = true;
  const read = await get(); assert.equal(read.status, 503); assert.equal((await read.text()).includes(storageMessage), false);
  storageFailure = false; uploadFailure = true;
  const save = await route.PUT(request(), context()); assert.equal(save.status, 503); assert.equal((await save.text()).includes(storageMessage), false);
  assert.equal(uploads, 0); assert.deepEqual(invalidated, []);
  configured = false;
  assert.equal((await get()).status, 503); assert.equal(await repository.getPublicRakutenBanner(definition.id), null);
});
test("future banner placements have separate defaults and storage objects", async () => {
  const other = { id: "article-banner", label: "記事", location: "記事の下", revalidatePaths: ["/articles"] };
  const defaults = createDefaultRakutenBanner(other); assert.equal(defaults.enabled, false); assert.equal(defaults.imageUrl, "");
  await repository.updateRakutenBanner(other, defaults);
  assert.ok(files.has("rakuten-banners/article-banner.json")); assert.equal(files.has(path), false);
  assert.equal((await repository.getRakutenBanner(definition)).enabled, true);
});
test("invalid dimensions, missing copy or missing enabled URLs cannot publish", () => {
  for (const patch of [{ width: 0 }, { height: 4001 }, { width: 4.5 }, { alt: "" }, { alt: "a".repeat(161) }, { linkUrl: "" }, { imageUrl: "" }, { enabled: "true" }]) {
    assert.throws(() => parseRakutenBanner({ ...createDefaultRakutenBanner(definition), ...patch }, definition));
  }
});
