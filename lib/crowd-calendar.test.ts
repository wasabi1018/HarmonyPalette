import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCrowdCalendarMonth,
  crowdOverridesEqual,
  normalizeCrowdOverrides,
} from "@/lib/crowd-calendar";

test("月に必要な週数だけ日曜始まりのセルを作る", () => {
  const october = buildCrowdCalendarMonth("2026-10");
  assert.ok(october);
  assert.equal(october.weekCount, 5);
  assert.equal(october.cells.length, 35);
  assert.equal(october.cells[0].date, "2026-09-27");
  assert.equal(october.cells.at(-1)?.date, "2026-10-31");

  const august = buildCrowdCalendarMonth("2026-08");
  assert.ok(august);
  assert.equal(august.weekCount, 6);
  assert.equal(august.cells.length, 42);
});

test("営業日は普通が初期値で、休園日は手動設定より優先する", () => {
  const calendar = buildCrowdCalendarMonth(
    "2026-10",
    { "2026-10-03": "busy", "2026-10-14": "veryBusy" },
    new Set(["2026-10-14"]),
  );
  assert.ok(calendar);
  assert.equal(calendar.cells.find((cell) => cell.date === "2026-10-01")?.level, "normal");
  assert.equal(calendar.cells.find((cell) => cell.date === "2026-10-03")?.level, "busy");
  assert.equal(calendar.cells.find((cell) => cell.date === "2026-10-14")?.level, "closed");
  assert.equal(calendar.cells.find((cell) => cell.date === "2026-09-30")?.level, null);
});

test("下書きでは対象月の有効な混雑日のみ保存する", () => {
  const overrides = normalizeCrowdOverrides("2026-02", {
    "2026-02-01": "busy",
    "2026-02-02": "normal",
    "2026-02-29": "veryBusy",
    "2026-03-01": "veryBusy",
    "2026-02-05": "unknown",
  });
  assert.deepEqual(overrides, { "2026-02-01": "busy" });
  assert.equal(crowdOverridesEqual(overrides, { "2026-02-01": "busy" }), true);
  assert.equal(crowdOverridesEqual(overrides, {}), false);
  assert.equal(buildCrowdCalendarMonth("2026-13"), null);
});
