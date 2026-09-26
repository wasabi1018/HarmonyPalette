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

test("ビンゴガイドはカード購入と場所取りの予定を案内する", () => {
  const bingo = PLAN_BEFORE_YOU_GO.items.find((item) => item.id === "bingo");
  assert.ok(bingo);
  assert.deepEqual(bingo.content, [
    { type: "paragraph", text: "ビンゴは、参加するのにビンゴカードの購入が必要です。" },
    { type: "paragraph", text: "開演30分前から客席後方で数量限定で販売しています。" },
    { type: "paragraph", text: "1人3枚まで購入可能です。" },
  ]);
  assert.equal(bingo.planAction, "ビンゴカードの購入時間＆場所取りの予定も確保する");
});
