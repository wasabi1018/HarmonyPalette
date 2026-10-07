import assert from "node:assert/strict";
import { test } from "node:test";
import { createDefaultHomepageGuideCards, normalizeHomepageGuideCards, normalizeHomepageGuideUrl } from "./homepage-guide-cards";

test("guide links reject executable, protocol-relative and credential-bearing URLs", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "//evil.example", "/\\evil.example", "https://user:password@example.com", "https://example.com\n/path", "http://example.com", ""]) {
    assert.throws(() => normalizeHomepageGuideUrl(url), url);
  }
  assert.equal(normalizeHomepageGuideUrl(" /articles/guide?source=top#section "), "/articles/guide?source=top#section");
  assert.equal(normalizeHomepageGuideUrl("https://example.com/guide"), "https://example.com/guide");
});

test("card edits preserve all three fields and reject incomplete or oversized payloads", () => {
  const cards = createDefaultHomepageGuideCards();
  cards[0] = { title: "  新しい見出し  ", url: "/articles/updated", description: "  新しい説明文  " };
  assert.deepEqual(normalizeHomepageGuideCards(cards)[0], { title: "新しい見出し", url: "/articles/updated", description: "新しい説明文" });
  assert.throws(() => normalizeHomepageGuideCards(cards.slice(0, 2)));
  assert.throws(() => normalizeHomepageGuideCards([...cards.slice(0, 2), null]));
  assert.throws(() => normalizeHomepageGuideCards(cards.map((card) => ({ ...card, description: "" }))));
  assert.throws(() => normalizeHomepageGuideCards(cards.map((card) => ({ ...card, title: "長".repeat(81) }))));
  assert.throws(() => normalizeHomepageGuideCards(cards.map((card) => ({ ...card, description: "長".repeat(181) }))));
  assert.throws(() => normalizeHomepageGuideUrl(`https://example.com/${"a".repeat(2048)}`));
});
