import assert from "node:assert/strict";
import { before, beforeEach, mock, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GuideArticleDirectory } from "../../components/guide-article-directory";
import type { ParkGuideCatalog } from "../park-guides";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const guide = { id: "guide", title: "ファンスタジオ", summary: "整理券の案内", articleUrl: "/articles/fan-studio", contentHtml: "<p>一覧でも展開して読める本文</p>" };
let catalog: ParkGuideCatalog;
let unavailable = false;
let articles: { slug: string; updatedAt: string; guide: { eventKey: null; categoryId: null; displayOrder: number } }[];
const moduleUrl = (file: string) => pathToFileURL(resolve(__dirname, file));
mock.module("server-only", { defaultExport: {} });
mock.module("next/cache", { namedExports: { unstable_cache: (callback: () => unknown) => callback, revalidatePath: () => {}, revalidateTag: () => {} } });
mock.module(moduleUrl("repository.ts"), { namedExports: { getPublicGuideCatalog: async () => { if (unavailable) throw new Error("unavailable"); return catalog; }, getGuideSettings: async () => ({ preparing: catalog.preparing, updatedAt: null }) } });
mock.module(moduleUrl("../articles/repository.ts"), { namedExports: { listPublishedArticles: async () => articles } });
mock.module(moduleUrl("../articles/series-repository.ts"), { namedExports: { listPublishedArticleSeries: async () => [] } });

let page: typeof import("../../app/(site)/guides/page");
let sitemap: typeof import("../../app/sitemap");
before(async () => {
  page = await import(moduleUrl("../../app/(site)/guides/page.tsx").href);
  sitemap = await import(moduleUrl("../../app/sitemap.ts").href);
});
beforeEach(() => {
  unavailable = false;
  catalog = { preparing: false, groups: [{ id: "greeting", name: "グリーティング", guides: [guide] }] };
  articles = [{ slug: "fan-studio", updatedAt: "2026-11-22T00:00:00Z", guide: { eventKey: null, categoryId: null, displayOrder: 0 } }];
});

test("guide directory expands native disclosures while keeping bodies and optional article links in server HTML", () => {
  const html = renderToStaticMarkup(createElement(GuideArticleDirectory, { data: catalog }));
  assert.match(html, /href="\/articles\/fan-studio"/);
  assert.match(html, /ファンスタジオ/);
  assert.match(html, /<details/);
  assert.match(html, /一覧でも展開して読める本文/);
  const summary = html.match(/<summary[\s\S]*?<\/summary>/)?.[0];
  assert.ok(summary);
  assert.match(summary, /ファンスタジオ/);
  assert.doesNotMatch(summary, /<a\b/);
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:[=>\s])/);
});

test("ready guide directory allows indexing and keeps its canonical URL", async () => {
  const metadata = await page.generateMetadata();
  assert.deepEqual(metadata.robots, { index: true, follow: true });
  assert.equal(metadata.alternates?.canonical, "/guides");
});

test("preparing, empty and unavailable directories remain noindex", async () => {
  catalog.preparing = true;
  assert.deepEqual((await page.generateMetadata()).robots, { index: false, follow: true });
  catalog = { preparing: false, groups: [] };
  assert.deepEqual((await page.generateMetadata()).robots, { index: false, follow: true });
  unavailable = true;
  assert.deepEqual((await page.generateMetadata()).robots, { index: false, follow: true });
});

test("sitemap includes the ready directory and published article URLs, excluding empty or preparing directories", async () => {
  let urls = (await sitemap.default()).map((entry) => entry.url);
  assert.ok(urls.some((url) => url.endsWith("/guides")));
  assert.ok(urls.some((url) => url.endsWith("/articles/fan-studio")));
  catalog.preparing = true;
  urls = (await sitemap.default()).map((entry) => entry.url);
  assert.ok(!urls.some((url) => url.endsWith("/guides")));
  assert.ok(urls.some((url) => url.endsWith("/articles/fan-studio")));
  catalog.preparing = false;
  articles = [];
  assert.ok(!(await sitemap.default()).some((entry) => entry.url.endsWith("/guides")));
});
