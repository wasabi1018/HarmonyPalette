import assert from "node:assert/strict";
import test from "node:test";
import { isScheduleInDateRange } from "@/lib/schedule-date-filter";

test("開始日と終了日の範囲に含まれる予定を判定する", () => {
  assert.equal(isScheduleInDateRange({ date: "2026-08-06" }, "2026-08-06", "2026-08-08"), true);
  assert.equal(isScheduleInDateRange({ date: "2026-08-08" }, "2026-08-06", "2026-08-08"), true);
  assert.equal(isScheduleInDateRange({ date: "2026-08-05" }, "2026-08-06", "2026-08-08"), false);
  assert.equal(isScheduleInDateRange({ date: "2026-08-09" }, "2026-08-06", "2026-08-08"), false);
});

test("検索期間と重なる複数日イベントを含める", () => {
  assert.equal(isScheduleInDateRange(
    { date: "2026-08-01", endDate: "2026-08-07" },
    "2026-08-06",
    "2026-08-08",
  ), true);
  assert.equal(isScheduleInDateRange(
    { date: "2026-08-08", endDate: "2026-08-12" },
    "2026-08-06",
    "2026-08-08",
  ), true);
});

test("開始日または終了日だけでも絞り込める", () => {
  const entry = { date: "2026-08-06" };
  assert.equal(isScheduleInDateRange(entry, "2026-08-07", ""), false);
  assert.equal(isScheduleInDateRange(entry, "", "2026-08-05"), false);
  assert.equal(isScheduleInDateRange(entry, "", ""), true);
});
