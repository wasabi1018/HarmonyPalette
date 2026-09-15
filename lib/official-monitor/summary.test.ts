import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOfficialUpdateSummary,
  diffNewsMetadata,
  mergeOfficialUpdateSection,
  officialUpdateDatesText,
  readOfficialUpdateSections,
} from "@/lib/official-monitor/summary";
import type { OfficialUpdateSection } from "@/lib/official-monitor/types";

test("multiple updated areas are described in one natural Japanese summary", () => {
  const sections: OfficialUpdateSection[] = [
    { key: "news", dates: [], diffCounts: { added: 1 }, highlights: [] },
    { key: "funstudio-schedule", dates: ["2026-09-20"], diffCounts: { modified: 2 }, highlights: [] },
  ];
  assert.equal(
    buildOfficialUpdateSummary(sections),
    "お知らせ一覧とファンスタジオのスケジュールが変更されました。",
  );
});

test("section summaries merge dates and counts without duplicates", () => {
  const sections: OfficialUpdateSection[] = [];
  mergeOfficialUpdateSection(sections, {
    key: "harmonyland-schedule",
    dates: ["2026-09-20"],
    diffCounts: { added: 2 },
    highlights: [],
  });
  mergeOfficialUpdateSection(sections, {
    key: "harmonyland-schedule",
    dates: ["2026-09-20", "2026-09-21"],
    diffCounts: { added: 1, removed: 1 },
    highlights: [],
  });
  assert.deepEqual(sections, [{
    key: "harmonyland-schedule",
    dates: ["2026-09-20", "2026-09-21"],
    diffCounts: { added: 3, removed: 1 },
    highlights: [],
  }]);
});

test("news additions, edits, and removals include reviewable titles", () => {
  const entry = (id: string, title: string, contentSha256: string) => ({
    id,
    title,
    url: `https://www.harmonyland.jp/news/${id}`,
    publishedAt: "2026.09.15",
    contentSha256,
  });
  const result = diffNewsMetadata(
    { entries: [entry("1", "既存のお知らせ", "old"), entry("2", "終了したお知らせ", "same")] },
    { entries: [entry("1", "更新されたお知らせ", "new"), entry("3", "新しいお知らせ", "same")] },
  );
  assert.deepEqual(result.diffCounts, { modified: 1, added: 1, removed: 1 });
  assert.deepEqual(result.highlights.map((item) => item.label), [
    "変更: 更新されたお知らせ",
    "追加: 新しいお知らせ",
    "削除候補: 終了したお知らせ",
  ]);
});

test("stored section metadata is parsed defensively", () => {
  assert.deepEqual(readOfficialUpdateSections({
    sections: [{
      key: "funstudio-schedule",
      dates: ["2026-09-20", "invalid"],
      diffCounts: { modified: 2 },
      highlights: [{ label: "確認リンク", url: "javascript:alert(1)" }],
    }],
  }), [{
    key: "funstudio-schedule",
    dates: ["2026-09-20"],
    diffCounts: { modified: 2 },
    highlights: [{ label: "確認リンク" }],
  }]);
});

test("section dates are formatted for Japanese notifications", () => {
  assert.equal(officialUpdateDatesText(["2026-09-20", "2026-09-21"]), "2026年9月20日、2026年9月21日");
});
