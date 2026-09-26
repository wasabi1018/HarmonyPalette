import assert from "node:assert/strict";
import test from "node:test";
import { RECOMMENDED_PLAN_BUILDING } from "./recommended-plan-building";

test("おすすめのプランの立て方は5ステップを表示順に持つ", () => {
  assert.deepEqual(
    RECOMMENDED_PLAN_BUILDING.steps.map((step) => step.id),
    ["priorities", "fixed-times", "preparation", "meal-break", "flexible-time"],
  );
});

test("各ステップは見出しと説明を持つ", () => {
  for (const step of RECOMMENDED_PLAN_BUILDING.steps) {
    assert.ok(step.title.trim());
    assert.ok(step.description.trim());
  }
});

test("完成チェックは3項目で、関連記事はサイト内URLを使う", () => {
  assert.equal(RECOMMENDED_PLAN_BUILDING.checklist.length, 3);
  assert.match(RECOMMENDED_PLAN_BUILDING.articleLink.href, /^\/articles\/[a-z0-9-]+$/);
});
