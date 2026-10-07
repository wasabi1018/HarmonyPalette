import assert from "node:assert/strict";
import { before, beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createDefaultRakutenPrPlacement } from "./rakuten-pr";
import { articleIdFromRakutenPlacement, createArticleRakutenDefinition } from "./rakuten-article";
import { articleIdFromRakutenBanner, createArticleRakutenBannerDefinition } from "./rakuten-article";
import { createDefaultRakutenBanner, getRakutenBannerDefinition } from "./rakuten-banner";

const id = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const baseArticle = { id, slug: "qa-article", title: "記事", contentHtml: "<p>導入</p><h2>準備</h2><p>本文</p><h2>楽しみ方</h2><p>結び</p>" };
let article: typeof baseArticle | null;
let authorized: boolean;
let articleReads = 0;
const files = new Map<string, string>();
const invalidated: { path: string; type?: string }[] = [];
const products = [1, 2].map((index) => ({ itemCode: `qa-shop:${index}`, itemName: `商品${index}`, itemUrl: `https://item.rakuten.co.jp/qa-shop/${index}/`, affiliateUrl: `https://hb.afl.rakuten.co.jp/qa/${index}`, imageUrl: `https://thumbnail.image.rakuten.co.jp/qa/${index}.jpg`, shopName: "QA", itemPrice: 1000 }));

mock.module("server-only", { defaultExport: {} });
mock.module("next/cache", { namedExports: { revalidatePath: (path: string, type?: string) => invalidated.push({ path, type }) } });
mock.module(pathToFileURL(resolve(__dirname, "articles/repository.ts")), { namedExports: { getAdminArticle: async (requested: string) => { articleReads++; return article?.id === requested ? article : null; } } });
mock.module(pathToFileURL(resolve(__dirname, "supabase/auth-server.ts")), { namedExports: { getAdminAccess: async () => authorized ? { ok: true } : { ok: false, reason: "unauthenticated" } } });
mock.module(pathToFileURL(resolve(__dirname, "supabase/server.ts")), { namedExports: { getSupabaseAdminClient: () => ({ storage: {
  getBucket: async () => ({ data: { public: false }, error: null }),
  from: () => ({
    download: async (path: string) => files.has(path) ? { data: new Blob([files.get(path)!]), error: null } : { data: null, error: { message: "Object not found" } },
    upload: async (path: string, body: Buffer) => { files.set(path, body.toString()); return { error: null }; },
  }),
} }) } });
mock.module(pathToFileURL(resolve(__dirname, "rakuten-settings.ts")), { namedExports: { getRakutenSettingsStatus: async () => ({ configured: true, hasAffiliateId: true }) } });
mock.module(pathToFileURL(resolve(__dirname, "rakuten-pr-data.ts")), { namedExports: { getRakutenPrProducts: async (placements: { items: { itemCode: string }[] }[]) => ({ products: products.filter((product) => placements.some((placement) => placement.items.some((item) => item.itemCode === product.itemCode))), productError: "" }) } });

let route: typeof import("../app/api/admin/rakuten-pr/[placementId]/route");
let data: typeof import("./rakuten-article-data");
let content: typeof import("./articles/rakuten-content");
let publishing: typeof import("./articles/publishing");
let bannerRoute: typeof import("../app/api/admin/rakuten-banners/[placementId]/route");
let bannerData: typeof import("./rakuten-article-banner-data");
before(async () => {
  route = await import(pathToFileURL(resolve(__dirname, "../app/api/admin/rakuten-pr/[placementId]/route.ts")).href);
  data = await import(pathToFileURL(resolve(__dirname, "rakuten-article-data.ts")).href);
  content = await import(pathToFileURL(resolve(__dirname, "articles/rakuten-content.ts")).href);
  publishing = await import(pathToFileURL(resolve(__dirname, "articles/publishing.ts")).href);
  bannerRoute = await import(pathToFileURL(resolve(__dirname, "../app/api/admin/rakuten-banners/[placementId]/route.ts")).href);
  bannerData = await import(pathToFileURL(resolve(__dirname, "rakuten-article-banner-data.ts")).href);
});
beforeEach(() => { article = { ...baseArticle }; authorized = true; articleReads = 0; files.clear(); invalidated.length = 0; });
const context = (placementId = `article-inline-${id}`) => ({ params: Promise.resolve({ placementId }) });
const put = (body: unknown, origin = "https://example.test") => new Request("https://example.test/api/admin/rakuten-pr", { method: "PUT", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
function draft() {
  const definition = data.articleRakutenDefinition(baseArticle);
  return { ...createDefaultRakutenPrPlacement(definition), beforeHeadingId: "楽しみ方", items: products.map((product) => ({ itemCode: product.itemCode, description: "紹介" })) };
}

test("article scopes require a UUID and remain separate from TOP and other articles", () => {
  assert.equal(articleIdFromRakutenPlacement(`article-inline-${id}`), id);
  for (const invalid of ["home-pickup", "article-inline-../../integration-secrets", "article-inline-not-a-uuid"]) assert.equal(articleIdFromRakutenPlacement(invalid), null);
  assert.notEqual(createArticleRakutenDefinition({ id, slug: "one" }, []).id, createArticleRakutenDefinition({ id: otherId, slug: "two" }, []).id);
});

test("authentication runs before article lookup or settings access", async () => {
  authorized = false;
  assert.equal((await route.GET(new Request("https://example.test"), context())).status, 401);
  assert.equal((await route.PUT(put(draft()), context())).status, 401);
  assert.equal(articleReads, 0); assert.equal(files.size, 0);
});

test("missing or removed articles and invalid scopes cannot create settings", async () => {
  article = null;
  assert.equal((await route.PUT(put(draft()), context())).status, 404);
  assert.equal((await route.PUT(put(draft()), context("article-inline-../secret"))).status, 404);
  assert.equal(files.size, 0);
});

test("publishing validates two products and a current heading", async () => {
  const value = { ...draft(), enabled: true };
  for (const body of [{ ...value, items: value.items.slice(0, 1) }, { ...value, beforeHeadingId: "" }, { ...value, beforeHeadingId: "消えた見出し" }]) {
    assert.equal((await route.PUT(put(body), context())).status, 400);
  }
  assert.equal(files.size, 0);
  assert.equal((await route.PUT(put(value, "https://foreign.test"), context())).status, 403);
});

test("article save/reload preserves products and position without overwriting shared settings", async () => {
  const top = '{"placementId":"home-pickup","enabled":false}';
  files.set("rakuten-pr/home-pickup.json", top);
  const response = await route.PUT(put({ ...draft(), enabled: true }), context());
  assert.equal(response.status, 200);
  const saved = (await response.json()).placement;
  const loaded = await route.GET(new Request("https://example.test"), context());
  assert.deepEqual((await loaded.json()).placement, saved);
  assert.equal(files.get("rakuten-pr/home-pickup.json"), top);
  assert.equal(files.has(`rakuten-pr/article-inline-${otherId}.json`), false);
  assert.ok(invalidated.some((entry) => entry.path === "/articles/qa-article"));
  const reads = articleReads;
  const display = await data.getPublicArticleRakutenPr(baseArticle);
  assert.equal(display?.display.items.length, 2); assert.equal(display?.beforeHeadingId, "楽しみ方");
  assert.equal(articleReads, reads, "public rendering does not query drafts through the admin repository");
});

test("a deleted heading hides only inline PR and can be repaired in management", async () => {
  await route.PUT(put({ ...draft(), enabled: true }), context());
  article = { ...baseArticle, contentHtml: "<p>導入</p><h2>新しい見出し</h2><p>本文</p>" };
  assert.equal(await data.getPublicArticleRakutenPr(article), null);
  const stored = await route.GET(new Request("https://example.test"), context());
  assert.equal((await stored.json()).placement.beforeHeadingId, "楽しみ方");
  assert.equal((await route.PUT(put({ ...draft(), enabled: true, beforeHeadingId: "新しい見出し" }), context())).status, 200);
  assert.equal((await data.getPublicArticleRakutenPr(article))?.beforeHeadingId, "新しい見出し");
});

test("disabled article settings preserve selections and remain hidden", async () => {
  assert.equal((await route.PUT(put(draft()), context())).status, 200);
  assert.equal(await data.getPublicArticleRakutenPr(baseArticle), null);
  assert.equal(JSON.parse(files.get(`rakuten-pr/article-inline-${id}.json`)!).items.length, 2);
});

test("HTML is split only at root headings and preserves every original character", () => {
  const prepared = publishing.prepareArticleContent("<p>導入</p><blockquote><h2>引用内</h2><p>引用</p></blockquote><h2>同じ見出し</h2><ul><li>項目</li></ul><h2>同じ見出し</h2><p>結び</p>");
  const headings = content.articleRakutenHeadings(prepared.html, prepared.headings);
  assert.deepEqual(headings.map((heading) => heading.id), ["同じ見出し", "同じ見出し-2"]);
  assert.equal(content.splitArticleHtmlBeforeHeading(prepared.html, "引用内"), null);
  const split = content.splitArticleHtmlBeforeHeading(prepared.html, "同じ見出し-2")!;
  assert.equal(split.before + split.after, prepared.html);
  assert.ok(split.before.endsWith("</ul>")); assert.ok(split.after.startsWith('<h2 id="同じ見出し-2">'));
  assert.equal(content.splitArticleHtmlBeforeHeading(prepared.html, "missing"), null);
});

test("a corrupt optional PR setting cannot break the public article", async () => {
  files.set(`rakuten-pr/article-inline-${id}.json`, "{ broken");
  assert.equal(await data.getPublicArticleRakutenPr(baseArticle), null);
  assert.equal((await route.PUT(put(draft()), context())).status, 503);
  assert.equal(files.get(`rakuten-pr/article-inline-${id}.json`), "{ broken");
});

function commonBanner() {
  return createDefaultRakutenBanner(getRakutenBannerDefinition("article-top"));
}
function customBanner() {
  return { ...commonBanner(), ...createDefaultRakutenBanner(createArticleRakutenBannerDefinition(baseArticle)), mode: "custom", enabled: true, linkUrl: "https://hb.afl.rakuten.co.jp/hsc/article-test/", imageUrl: "https://hbb.afl.rakuten.co.jp/hsb/article-test/" };
}

test("articles inherit the current common banner by default without an admin lookup", async () => {
  const initial = await bannerData.getPublicArticleRakutenBanner(baseArticle);
  assert.equal(initial?.enabled, true);
  const top = createDefaultRakutenBanner(getRakutenBannerDefinition("home-between-articles-birthday"));
  assert.equal(initial?.placementId, "article-top");
  assert.equal(initial?.linkUrl, top.linkUrl);
  assert.equal(initial?.imageUrl, top.imageUrl);
  assert.equal(files.size, 0, "initial rendering does not write settings");
  assert.equal(articleReads, 0);
  files.set("rakuten-banners/article-top.json", JSON.stringify(commonBanner()));
  const reads = articleReads;
  assert.equal((await bannerData.getPublicArticleRakutenBanner(baseArticle))?.linkUrl, commonBanner().linkUrl);
  const changed = { ...commonBanner(), linkUrl: "https://hb.afl.rakuten.co.jp/hsc/new-common/" };
  assert.equal((await bannerRoute.PUT(put(changed), context("article-top"))).status, 200);
  assert.equal((await bannerData.getPublicArticleRakutenBanner(baseArticle))?.linkUrl, changed.linkUrl);
  assert.equal((await bannerData.getPublicArticleRakutenBanner({ id: otherId, slug: "other" }))?.linkUrl, changed.linkUrl);
  assert.equal(articleReads, reads);
  assert.ok(invalidated.some((entry) => entry.path === "/articles/[slug]" && entry.type === "page"));
});

test("an explicitly disabled common banner remains hidden while custom article banners stay independent", async () => {
  const top = createDefaultRakutenBanner(getRakutenBannerDefinition("home-between-articles-birthday"));
  files.set("rakuten-banners/home-between-articles-birthday.json", JSON.stringify(top));
  const disabled = { ...commonBanner(), enabled: false };
  assert.equal((await bannerRoute.PUT(put(disabled), context("article-top"))).status, 200);
  assert.equal(await bannerData.getPublicArticleRakutenBanner(baseArticle), null);
  const loaded = await bannerRoute.GET(new Request("https://example.test"), context("article-top"));
  assert.equal(loaded.status, 200);
  assert.equal((await loaded.json()).banner.enabled, false);
  const custom = customBanner();
  assert.equal((await bannerRoute.PUT(put(custom), context(`article-banner-${id}`))).status, 200);
  assert.equal((await bannerData.getPublicArticleRakutenBanner(baseArticle))?.linkUrl, custom.linkUrl);
  assert.equal(await bannerData.getPublicArticleRakutenBanner({ id: otherId, slug: "other" }), null);
  assert.equal((await bannerRoute.PUT(put(commonBanner()), context("article-top"))).status, 200);
  assert.equal((await bannerData.getPublicArticleRakutenBanner({ id: otherId, slug: "other" }))?.enabled, true);
  assert.equal(files.get("rakuten-banners/home-between-articles-birthday.json"), JSON.stringify(top));
});

test("individual banners can override, hide, and return to inheritance without affecting another article", async () => {
  const common = commonBanner();
  files.set("rakuten-banners/article-top.json", JSON.stringify(common));
  const ctx = context(`article-banner-${id}`);
  const custom = customBanner();
  assert.equal((await bannerRoute.PUT(put(custom), ctx)).status, 200);
  assert.equal((await bannerRoute.GET(new Request("https://example.test"), ctx)).status, 200);
  assert.equal((await bannerData.getPublicArticleRakutenBanner(baseArticle))?.linkUrl, custom.linkUrl);
  assert.equal((await bannerData.getPublicArticleRakutenBanner({ id: otherId, slug: "other" }))?.linkUrl, common.linkUrl);
  assert.equal((await bannerRoute.PUT(put({ ...custom, enabled: false }), ctx)).status, 200);
  assert.equal(await bannerData.getPublicArticleRakutenBanner(baseArticle), null);
  assert.equal((await bannerData.getPublicArticleRakutenBanner({ id: otherId, slug: "other" }))?.enabled, true);
  assert.equal((await bannerRoute.PUT(put({ ...custom, mode: "inherit", enabled: false }), ctx)).status, 200);
  assert.equal((await bannerData.getPublicArticleRakutenBanner(baseArticle))?.linkUrl, common.linkUrl);
  assert.equal(JSON.parse(files.get(`rakuten-banners/article-banner-${id}.json`)!).mode, "inherit");
  assert.equal(files.get("rakuten-banners/article-top.json"), JSON.stringify(common));
  assert.ok(invalidated.some((entry) => entry.path === "/articles/qa-article"));
});

test("individual banner scopes enforce authentication, article existence, and valid modes", async () => {
  assert.equal(articleIdFromRakutenBanner(`article-banner-${id}`), id);
  assert.equal(articleIdFromRakutenBanner("article-banner-../secret"), null);
  const ctx = context(`article-banner-${id}`);
  authorized = false;
  assert.equal((await bannerRoute.PUT(put(customBanner()), ctx)).status, 401);
  assert.equal(articleReads, 0);
  authorized = true;
  assert.equal((await bannerRoute.PUT(put({ ...customBanner(), mode: "invalid" }), ctx)).status, 400);
  article = null;
  assert.equal((await bannerRoute.PUT(put(customBanner()), ctx)).status, 404);
  assert.equal((await bannerRoute.GET(new Request("https://example.test"), context("article-banner-../secret"))).status, 404);
  assert.equal(files.size, 0);
});

test("a corrupt individual banner stays hidden and cannot be overwritten or bypassed by inheritance", async () => {
  files.set("rakuten-banners/article-top.json", JSON.stringify(commonBanner()));
  const path = `rakuten-banners/article-banner-${id}.json`;
  files.set(path, "{ broken");
  assert.equal(await bannerData.getPublicArticleRakutenBanner(baseArticle), null);
  assert.equal((await bannerRoute.PUT(put(customBanner()), context(`article-banner-${id}`))).status, 503);
  assert.equal(files.get(path), "{ broken");
});
