import assert from "node:assert/strict";
import { test } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GuideManager } from "../../components/admin/guide-manager";
import { guideManuscripts } from "./manuscripts";
import type { GuideArticle } from "./model";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const guide = (id: string, title: string, changes: Partial<GuideArticle> = {}): GuideArticle => ({
  id, title, slug: id, excerpt: "案内", status: "draft", contentHtml: `<p>${title}の保存済み本文</p>`,
  eventKey: null, categoryId: null, displayOrder: 0, ...changes,
});

test("saved shows appear beside starter manuscripts with edit links and a complete preview", () => {
  const guides = [guide("merry", "MERRY WHITE CHRISTMAS"), guide("parade", "パレードパラレル")];
  const data = { preparing: true, updatedAt: "2026-11-23T00:00:00Z", categories: [], events: [], articles: [], guides };
  const html = renderToStaticMarkup(createElement(GuideManager, { initialData: data }));
  const section = html.split('aria-labelledby="guide-starter-heading"')[1].split("</section>")[0];
  assert.match(section, /MERRY WHITE CHRISTMAS/);
  assert.match(section, /パレードパラレル/);
  assert.match(section, /href="\/admin\/articles\/merry"/);
  assert.match(section, /href="\/admin\/articles\/parade"/);
  assert.match(section, /6本のガイドをプレビュー/);
  const preview = guideManuscripts(guides).previewData.groups[0].guides;
  assert.equal(preview.length, 6);
  assert.equal(preview.find((item) => item.id === "merry")?.contentHtml, guides[0].contentHtml);
  assert.equal(guideManuscripts([...guides, guide("future", "追加のガイド")]).entries.length, 7);
});

test("an existing starter opens its saved article and previews the latest content without duplication or template replacement", () => {
  const saved = guide("fan", "編集済みのファンスタジオ", { eventKey: "harmonyland-funstudio", slug: "changed-slug", contentHtml: "<p>管理画面で編集した最新の本文</p>" });
  const result = guideManuscripts([saved]);
  assert.equal(result.entries.length, 4);
  assert.equal(result.entries[0].href, "/admin/articles/fan");
  assert.equal(result.entries[0].title, saved.title);
  assert.equal(result.previewData.groups[0].guides[0].contentHtml, saved.contentHtml);
  assert.ok(result.entries.slice(1).every((entry) => entry.href.includes("template=") && entry.status === null));
  assert.equal(saved.status, "draft");
});
