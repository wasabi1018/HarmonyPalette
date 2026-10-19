import assert from "node:assert/strict";
import { test } from "node:test";
import { expandDailyAdjustments, groupDailyAdjustments } from "./daily-adjustments";
import { DEFAULT_CONFIG, validateConfig } from "./model";
import type { Override } from "./types";

const adjustment = (date: string, change: Partial<Override> = {}): Override => ({
  date, points: 20, level: "", weather: "", reason: "子育て応援イベント",
  note: "検証用の内部メモ", ...change,
});

test("既存の同じ調整を複数日にまとめ、日付別の全設定を欠落なく復元する", () => {
  const original = [adjustment("2026-11-07"), adjustment("2026-11-03"), adjustment("2026-12-01", { points: -5 })];
  const before = structuredClone(original);
  const groups = groupDailyAdjustments(original);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].dates, ["2026-11-03", "2026-11-07"]);
  const sort = (items: Override[]) => items.sort((a, b) => a.date.localeCompare(b.date));
  assert.deepEqual(sort(expandDailyAdjustments(groups)), sort(structuredClone(original)));
  assert.deepEqual(original, before);
});

test("非公開メモ・理由・固定レベル・天気が異なる既存設定を統合しない", () => {
  const groups = groupDailyAdjustments([
    adjustment("2026-11-01"),
    adjustment("2026-11-02", { note: "別のメモ" }),
    adjustment("2026-11-03", { reason: "別の理由" }),
    adjustment("2026-11-04", { level: "busy" }),
    adjustment("2026-11-05", { weather: "rain" }),
  ]);
  assert.equal(groups.length, 5);
});

test("月跨ぎの複数日編集・選択解除・グループ削除を日付別API設定へ反映する", () => {
  const groups = groupDailyAdjustments([adjustment("2026-11-03"), adjustment("2026-11-07"), adjustment("2026-12-10", { points: 5 })]);
  groups[0].dates = ["2026-11-03", "2026-12-01"];
  groups[0].values = { points: -10, level: "quiet", weather: "rain", reason: "調整後の理由", note: "非公開" };
  const overrides = expandDailyAdjustments(groups.slice(0, 1));
  const config = validateConfig({ ...structuredClone(DEFAULT_CONFIG), overrides });
  assert.deepEqual(config.overrides, [
    adjustment("2026-11-03", groups[0].values),
    adjustment("2026-12-01", groups[0].values),
  ]);
  assert.deepEqual(groupDailyAdjustments(config.overrides)[0].dates, groups[0].dates);
});

test("日付未選択の新規項目や全選択解除を保存時に黙って除去しない", () => {
  const groups = groupDailyAdjustments([adjustment("2026-11-03")]);
  groups[0].dates = [];
  const overrides = expandDailyAdjustments(groups);
  assert.equal(overrides.length, 1);
  assert.equal(overrides[0].date, "");
  assert.throws(() => validateConfig({ ...structuredClone(DEFAULT_CONFIG), overrides }), /日別調整/);
});
