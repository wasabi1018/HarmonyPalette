import assert from "node:assert/strict";
import test from "node:test";
import {
  buildScheduleCalendarMonth,
  getScheduleCalendarMonthKeys,
} from "@/lib/schedule-calendar";

test("検索期間に含まれる月を年またぎで列挙する", () => {
  assert.deepEqual(
    getScheduleCalendarMonthKeys("2026-12-20", "2027-02-03"),
    ["2026-12", "2027-01", "2027-02"],
  );
});

test("日曜始まりの6週間カレンダーを生成する", () => {
  const month = buildScheduleCalendarMonth("2026-08", "2026-08-07", "2026-09-05");
  assert.ok(month);
  assert.equal(month.dates.length, 42);
  assert.equal(month.dates[0].date, "2026-07-26");
  assert.equal(month.dates.at(-1)?.date, "2026-09-05");
});

test("月内かつ検索範囲内の日だけが操作対象になる", () => {
  const month = buildScheduleCalendarMonth("2026-08", "2026-08-07", "2026-09-05");
  assert.ok(month);

  const beforeRange = month.dates.find(({ date }) => date === "2026-08-06");
  const firstTarget = month.dates.find(({ date }) => date === "2026-08-07");
  const adjacentMonth = month.dates.find(({ date }) => date === "2026-09-01");
  assert.deepEqual(
    [beforeRange, firstTarget, adjacentMonth].map((date) => [date?.isInMonth, date?.isInRange]),
    [[true, false], [true, true], [false, true]],
  );
});

test("不正または逆転した期間は月を返さない", () => {
  assert.deepEqual(getScheduleCalendarMonthKeys("2026-09-05", "2026-08-07"), []);
  assert.deepEqual(getScheduleCalendarMonthKeys("invalid", "2026-08-07"), []);
});
