import assert from "node:assert/strict";
import test from "node:test";
import {
  datedArticlePeriod,
  datedArticleStatus,
  shouldIndexPublishedArticle,
} from "./freshness";

test("数字と英語月を含む月別記事を判定する", () => {
  assert.deepEqual(datedArticlePeriod("2026-9"), { year: 2026, month: 9 });
  assert.deepEqual(datedArticlePeriod("harmonyland-september-2026-guide"), { year: 2026, month: 9 });
  assert.equal(datedArticlePeriod("harmonyland-report-2026-09-23"), null);
});

test("日本時間の当月記事はindexし、過去月はnoindexにする", () => {
  const september = new Date("2026-09-25T03:00:00Z");
  const october = new Date("2026-10-01T03:00:00Z");
  assert.equal(datedArticleStatus("2026-9", september)?.isCurrent, true);
  assert.equal(shouldIndexPublishedArticle("2026-9", september), true);
  assert.equal(shouldIndexPublishedArticle("2026-9", october), false);
  assert.equal(shouldIndexPublishedArticle("harmonyland-report-2026-09-23", october), true);
});
