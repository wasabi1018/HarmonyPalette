import assert from "node:assert/strict";
import { before, mock, test } from "node:test";
import { getSchema } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { DomUtils, parseDocument } from "htmlparser2";
import {
  ArticleLayout, ArticleLayoutColumn, ArticleLayoutImage, articleLayouts,
  createArticleLayoutContent, swapArticleLayout, unwrapArticleLayout,
} from "./layout";
import { assessArticleQuality } from "./quality";

mock.module("server-only", { defaultExport: {} });
let validation: typeof import("./validation");
before(async () => { validation = await import("./validation"); });

const schema = getSchema([StarterKit, Image, ArticleLayout, ArticleLayoutColumn, ArticleLayoutImage]);
const photo = { type: "articleLayoutImage", attrs: { src: "https://example.test/photo.jpg", alt: "会場の入口", caption: "朝の会場" } };
const paragraph = { type: "paragraph", content: [{ type: "text", text: "入口までの行き方を説明します。" }] };
const figure = '<figure data-article-image=""><img src="https://example.test/photo.jpg" alt="会場の入口"><figcaption>朝の会場</figcaption></figure>';
const html = `<div data-article-layout="image-left"><div data-article-layout-column="">${figure}</div><div data-article-layout-column=""><h2>会場への行き方</h2><p>入口までの行き方を説明します。</p></div></div>`;

test("3つの画像レイアウトを保存・再読込できるスキーマとして作成する", () => {
  for (const layout of articleLayouts) {
    const node = schema.nodeFromJSON(createArticleLayoutContent(layout.value));
    node.check();
    assert.equal(node.childCount, 2);
    assert.equal(node.child(0).firstChild?.type.name, layout.value === "image-right" ? "paragraph" : "articleLayoutImage");
    assert.equal(node.child(1).firstChild?.type.name, layout.value === "image-left" ? "paragraph" : "articleLayoutImage");
    assert.deepEqual(schema.nodeFromJSON(node.toJSON()).toJSON(), node.toJSON());
  }
});

test("左右入れ替えと解除で写真・説明文・キャプションを失わない", () => {
  const content = createArticleLayoutContent("image-left");
  content.content![0].content = [photo];
  content.content![1].content = [paragraph];
  const node = schema.nodeFromJSON(content);
  const swapped = swapArticleLayout(node);
  swapped.check();
  assert.equal(swapped.attrs.layout, "image-right");
  assert.equal(swapped.child(0).textContent, "入口までの行き方を説明します。");
  assert.deepEqual(swapped.child(1).firstChild?.attrs, node.child(0).firstChild?.attrs);
  assert.deepEqual(swapArticleLayout(swapped).toJSON(), node.toJSON());
  const unwrapped = schema.nodes.doc.create(null, unwrapArticleLayout(swapped));
  unwrapped.check();
  assert.equal(unwrapped.firstChild?.textContent, "入口までの行き方を説明します。");
  assert.equal(unwrapped.lastChild?.attrs.caption, "朝の会場");
});

test("写真2枚を入れ替えても2枚とそれぞれの説明を保持する", () => {
  const content = createArticleLayoutContent("two-images");
  content.content![0].content = [photo];
  content.content![1].content = [{ ...photo, attrs: { ...photo.attrs, src: "https://example.test/other.jpg", caption: "別の角度" } }];
  const swapped = swapArticleLayout(schema.nodeFromJSON(content));
  assert.equal(swapped.attrs.layout, "two-images");
  assert.equal(swapped.child(0).firstChild?.attrs.caption, "別の角度");
  assert.equal(swapped.child(1).firstChild?.attrs.caption, "朝の会場");
});

test("保存時の無害化でレイアウト・画像説明・キャプションを保持する", () => {
  const doc = { type: "doc", content: [createArticleLayoutContent("image-left")] };
  const saved = validation.parseArticleInput({ title: "会場の紹介", slug: "venue-guide", status: "draft", contentJson: doc, contentHtml: html });
  assert.equal(DomUtils.getOuterHTML(parseDocument(saved.contentHtml)), DomUtils.getOuterHTML(parseDocument(html)));
  schema.nodeFromJSON(saved.contentJson).check();
  assert.deepEqual(saved.contentJson, doc);
  assert.equal(validation.sanitizeArticleHtml("<p>従来の記事です。</p><img src=\"/old.jpg\" alt=\"以前の写真\">"), '<p>従来の記事です。</p><img src="/old.jpg" alt="以前の写真" />');
});

test("レイアウトを許可してもスクリプト・イベント・危険なURLを保存しない", () => {
  const unsafe = html.replace('data-article-layout="image-left"', 'data-article-layout="image-left" style="position:fixed" onclick="alert(1)"')
    .replace('src="https://example.test/photo.jpg"', 'src="javascript:alert(1)" onerror="alert(1)"') + '<script>alert(1)</script>';
  const cleaned = validation.sanitizeArticleHtml(unsafe);
  assert.match(cleaned, /data-article-layout="image-left"/);
  assert.doesNotMatch(cleaned, /onclick|onerror|javascript:|<script|position:fixed/);
});

test("未設定の写真を品質チェックで見つけ、下書きのまま保存できる", () => {
  const contentHtml = '<div data-article-layout="two-images"><div data-article-layout-column=""><figure data-article-image=""></figure></div><div data-article-layout-column=""><figure data-article-image=""><figcaption>未選択の写真</figcaption></figure></div></div>';
  const report = assessArticleQuality({ title: "写真レポート", slug: "photo-report", excerpt: "", seoTitle: "", seoDescription: "", coverImageUrl: "", tagCount: 0, contentHtml, contentLength: 100 });
  assert.match(report.checks.find((check) => check.id === "layout-images")?.message ?? "", /2か所/);
  assert.equal(validation.parseArticleInput({ title: "写真レポート", slug: "photo-report", status: "draft", contentJson: { type: "doc", content: [createArticleLayoutContent("two-images")] }, contentHtml }).status, "draft");
});
