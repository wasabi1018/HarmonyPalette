import assert from "node:assert/strict";
import test from "node:test";
import { PLAN_BEFORE_YOU_GO } from "./plan-before-you-go";

test("マイプランの事前ガイドは確定した6項目を表示順に持つ", () => {
  assert.deepEqual(
    PLAN_BEFORE_YOU_GO.items.map((item) => item.id),
    ["fan-studio", "parade", "show", "bingo", "travel-buffer", "meal-break"],
  );
});

test("各ガイド項目は要約・詳細・プラン行動を持つ", () => {
  for (const item of PLAN_BEFORE_YOU_GO.items) {
    assert.ok(item.title.trim());
    assert.ok(item.summary.trim());
    assert.ok(item.content.length > 0);
    assert.ok(item.planAction.trim());
  }
});

test("関連記事リンクはサイト内の記事URLを使う", () => {
  const links = PLAN_BEFORE_YOU_GO.items.flatMap((item) => item.links ?? []);
  assert.ok(links.length > 0);
  for (const link of links) {
    assert.match(link.href, /^\/articles\/[a-z0-9-]+$/);
  }
});
