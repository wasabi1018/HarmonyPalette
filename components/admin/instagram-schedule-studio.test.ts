import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyFanStudioSchedule,
  buildFanStudioRows,
  getDailyFanStudioPeriods,
} from "@/components/admin/instagram-schedule-studio";
import type { Character } from "@/data/types";
import type { ScheduleEntry } from "@/lib/schedule-store";

const regularCharacter: Character = {
  id: "regular-character",
  slug: "regular-character",
  name: "レギュラーキャラクター",
  nameKana: "れぎゅらーきゃらくたー",
  image: "",
  description: "",
  officialUrl: "",
  isFanStudioRegular: true,
  themeColor: "#eb6e98",
  birthdayMonth: null,
  birthdayDay: null,
};

const scheduledEntry: ScheduleEntry = {
  id: "scheduled-character",
  kind: "greeting",
  title: "予定キャラクター ファンスタジオグリーティング",
  date: "2026-09-02",
  startTime: "10:00",
  characterIds: [],
  characterNames: ["予定キャラクター"],
  scheduleType: "ファンスタジオグリーティング",
  location: "ファンスタジオ101号室",
  description: "",
  officialUrl: "",
  sourceName: "テスト",
  updatedAt: "2026-08-15T00:00:00.000Z",
  status: "upcoming",
  isSample: false,
};

const period = {
  id: "2026-08-31",
  start: "2026-08-31",
  end: "2026-09-06",
};

test("休園日は常時登場キャラクターのハートを表示しない", () => {
  const rows = buildFanStudioRows(period, [], [regularCharacter], new Set(["2026-09-02"]));

  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].cells, ["normal", "normal", "closed", "normal", "normal", "normal", "normal"]);
});

test("休園日は個別予定も週間・日別ファンスタジオ表に表示しない", () => {
  const closedDates = new Set(["2026-09-02"]);
  const rows = buildFanStudioRows(period, [scheduledEntry], [], closedDates);
  const daily = buildDailyFanStudioSchedule("2026-09-02", [scheduledEntry], closedDates);

  assert.equal(rows[0].cells[2], "closed");
  assert.deepEqual(daily, { rooms: [], rows: [] });
});

test("日別ファンスタジオは選択日を含む月曜日から日曜日までを作成する", () => {
  assert.deepEqual(getDailyFanStudioPeriods("2026-08-26"), [
    { id: "2026-08-24", start: "2026-08-24", end: "2026-08-24" },
    { id: "2026-08-25", start: "2026-08-25", end: "2026-08-25" },
    { id: "2026-08-26", start: "2026-08-26", end: "2026-08-26" },
    { id: "2026-08-27", start: "2026-08-27", end: "2026-08-27" },
    { id: "2026-08-28", start: "2026-08-28", end: "2026-08-28" },
    { id: "2026-08-29", start: "2026-08-29", end: "2026-08-29" },
    { id: "2026-08-30", start: "2026-08-30", end: "2026-08-30" },
  ]);
});
