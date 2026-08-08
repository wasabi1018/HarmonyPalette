import assert from "node:assert/strict";
import test from "node:test";
import { buildScheduleEventOptionStates } from "@/lib/schedule-event-options";

test("終了日が本日より前のイベントを終了済みにする", () => {
  const options = buildScheduleEventOptionStates([
    { title: "終了イベント", date: "2026-08-01", endDate: "2026-08-07" },
    { title: "本日まで", date: "2026-08-01", endDate: "2026-08-08" },
    { title: "今後のイベント", date: "2026-08-09" },
  ], "2026-08-08", (entry) => entry.title);

  assert.deepEqual(
    Object.fromEntries(options.map((option) => [option.name, option.isEnded])),
    {
      "今後のイベント": false,
      "終了イベント": true,
      "本日まで": false,
    },
  );
});

test("同名イベントに有効な予定が残っていれば選択可能にする", () => {
  const [option] = buildScheduleEventOptionStates([
    { title: "継続イベント", date: "2026-07-01", endDate: "2026-07-31" },
    { title: "継続イベント", date: "2026-08-10", endDate: "2026-08-31" },
  ], "2026-08-08", (entry) => entry.title);

  assert.deepEqual(option, {
    name: "継続イベント",
    endDate: "2026-08-31",
    isEnded: false,
  });
});

test("選択肢名を持たない予定は除外する", () => {
  const options = buildScheduleEventOptionStates([
    { title: "通常イベント", date: "2026-08-10" },
    { title: "除外対象", date: "2026-08-10" },
  ], "2026-08-08", (entry) => entry.title === "除外対象" ? null : entry.title);

  assert.deepEqual(options.map((option) => option.name), ["通常イベント"]);
});
