import assert from "node:assert/strict";
import test from "node:test";
import {
  applyContextualArticleImageAlt,
  formatArticlePublishedDate,
  isUnhelpfulArticleImageAlt,
} from "./content-presentation";

test("公開日をサーバーとブラウザで共通の日本時間として表示する", () => {
  assert.equal(
    formatArticlePublishedDate("2026-07-31T15:30:00.000Z"),
    "2026年8月1日",
  );
  assert.equal(formatArticlePublishedDate(null), "");
  assert.equal(formatArticlePublishedDate("invalid"), "");
});

test("数字やファイル名だけの画像説明を検出する", () => {
  assert.equal(isUnhelpfulArticleImageAlt("7914"), true);
  assert.equal(isUnhelpfulArticleImageAlt("IMG_2048.JPG"), true);
  assert.equal(isUnhelpfulArticleImageAlt("駐車場の事前精算機"), false);
});

test("直前の見出しを使って曖昧な画像説明を補う", () => {
  const html = '<h2>駐車場へ到着</h2><p>本文</p><img src="/photo.webp" alt="7914" />';
  const result = applyContextualArticleImageAlt(html, "来園レポ");
  assert.match(result, /alt="駐車場へ到着を紹介する画像"/);
});

test("具体的な画像説明は保持する", () => {
  const html = '<img src="/photo.webp" alt="第1駐車場の待機列" />';
  assert.equal(applyContextualArticleImageAlt(html, "来園レポ"), html);
});
